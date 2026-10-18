/* Bakes the avatar's studio environment map so visitors never compile PMREM shaders.

   components/AvatarScene.tsx used to build the environment at runtime with
   `new PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04, 0.1, 100, { size: 128 })`.
   That runs a GGX importance-sampling shader which Windows D3D11/ANGLE needs ~1.3-2.2s to
   compile on a cold shader cache, blocking the main thread. This script runs the very same
   call once, in headless Chrome on the real GPU, reads the finished PMREM render target back
   and stores it in public/env/. At runtime the site rebuilds a DataTexture from that file.

   Usage:   node scripts/bake-env.mjs            (after `npm install`, from the repo root)
   Re-run it whenever three is upgraded (the output file name carries THREE.REVISION, so a
   stale bake is simply not found and the site falls back to the runtime path), or whenever
   ENV_SIZE / the RoomEnvironment parameters in AvatarScene.tsx change.
   Needs Chrome, Edge or Chromium. Set CHROME_PATH if it is not found automatically.

   Output: public/env/room-r<REVISION>-s<SIZE>.bin
           = zlib( header(16 bytes) + RGBE pixels, 4 bytes per texel, bottom row first,
                   each byte stored as its difference from the texel one row below it ). */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, constants as zc } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "env");
const threeDir = join(root, "node_modules", "three");

/* Must match ENV_SIZE in lib/bakedEnv.ts and the fromScene call in AvatarScene.tsx. */
const ENV_SIZE = 128;
const SIGMA = 0.04;

const args = process.argv.slice(2);
const rawOut = args.includes("--raw") ? args[args.indexOf("--raw") + 1] : null; // debug: dump float32 RGBA

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.");
  return found;
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>bake</title>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

window.bake = async (size, sigma) => {
  // Same renderer setup react-three-fiber gives the site (PMREM switches tone mapping off itself).
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";

  const t0 = performance.now();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(new RoomEnvironment(), sigma, 0.1, 100, { size });
  const { width, height } = target;
  // Read the half-float target back as FLOAT (always allowed for RGBA16F); the values are exact.
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.properties.get(target).__webglFramebuffer);
  const pixels = new Float32Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, pixels);
  const ms = performance.now() - t0;
  if (gl.getError() !== gl.NO_ERROR) throw new Error("readPixels failed");

  const bytes = new Uint8Array(pixels.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { revision: THREE.REVISION, width, height, gpu, ms, b64: btoa(bin) };
};
window.ready = true;
</script>`;

const MIME = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html" };

function startServer() {
  return new Promise((res) => {
    const server = createServer((req, rsp) => {
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/") {
        rsp.writeHead(200, { "content-type": "text/html" }).end(PAGE);
        return;
      }
      if (url.pathname.startsWith("/three/")) {
        const file = normalize(join(threeDir, url.pathname.slice("/three/".length)));
        if (file.startsWith(threeDir) && existsSync(file)) {
          rsp.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
          return;
        }
      }
      rsp.writeHead(404).end();
    });
    server.listen(0, "127.0.0.1", () => res(server));
  });
}

async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, fail) => {
    ws.onopen = ok;
    ws.onerror = () => fail(new Error("CDP connection failed"));
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    }
  };
  return {
    send: (method, params = {}) =>
      new Promise((ok, fail) => {
        pending.set(++id, { ok, fail });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    close: () => ws.close(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bakeInBrowser() {
  const server = await startServer();
  const profile = mkdtempSync(join(tmpdir(), "bake-env-"));
  const chrome = spawn(
    findChrome(),
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    // Chrome writes the chosen debugging port to DevToolsActivePort in the profile.
    let port = 0;
    for (let i = 0; i < 100 && !port; i++) {
      await sleep(100);
      const f = join(profile, "DevToolsActivePort");
      if (existsSync(f)) port = Number(readFileSync(f, "utf8").split("\n")[0]);
    }
    if (!port) throw new Error("Chrome did not start");
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const cdp = await cdpConnect(pages.find((p) => p.type === "page").webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
    for (let i = 0; i < 100; i++) {
      const r = await cdp.send("Runtime.evaluate", { expression: "window.ready === true", returnByValue: true });
      if (r.result.value) break;
      if (i === 99) throw new Error("bake page did not load");
      await sleep(100);
    }
    const r = await cdp.send("Runtime.evaluate", {
      expression: `window.bake(${ENV_SIZE}, ${SIGMA})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    cdp.close();
    return r.result.value;
  } finally {
    chrome.kill();
    server.close();
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold files */ }
  }
}

/* Shared-exponent RGBE (Radiance HDR): the brightest channel gets an 8-bit mantissa, the
   others share its exponent. Worst case relative error is 1/256 of the brightest channel,
   far below one 8-bit output step after the 0.3 environment intensity and tone mapping. */
function toRGBE(rgba, count) {
  const out = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const m = Math.max(r, g, b);
    if (!(m > 1e-32)) continue; // black -> 0,0,0,0
    let e = Math.ceil(Math.log2(m));
    let scale = 256 / 2 ** e;
    if (Math.round(m * scale) > 255) { e++; scale = 256 / 2 ** e; } // exact powers of two
    out[i * 4] = Math.round(r * scale);
    out[i * 4 + 1] = Math.round(g * scale);
    out[i * 4 + 2] = Math.round(b * scale);
    out[i * 4 + 3] = e + 128;
  }
  return out;
}

const baked = await bakeInBrowser();
const rgba = new Float32Array(Buffer.from(baked.b64, "base64").buffer.slice(0));
const { width, height, revision } = baked;
const count = width * height;
console.log(`three r${revision}, ${width}x${height} PMREM baked in ${baked.ms.toFixed(0)}ms on ${baked.gpu}`);
if (/swiftshader|llvmpipe|software/i.test(baked.gpu)) {
  console.warn("WARNING: baked on a software renderer. Results are still valid, but a real GPU is preferred.");
}
let maxA = 0, minA = 1;
for (let i = 0; i < count; i++) { maxA = Math.max(maxA, rgba[i * 4 + 3]); minA = Math.min(minA, rgba[i * 4 + 3]); }
if (maxA > 1 || (minA < 1 && minA !== 0)) console.warn(`note: alpha is not constant 1 (min ${minA}, max ${maxA}); the runtime assumes 1`);

if (rawOut) writeFileSync(rawOut, Buffer.from(rgba.buffer));

/* Row-wise delta (the PNG "Up" filter): neighbouring rows are near-identical, so deflate
   shrinks the file by about a third. Undone with a running sum in lib/bakedEnv.ts. */
function upFilter(px, width) {
  const stride = width * 4;
  const out = new Uint8Array(px.length);
  for (let i = 0; i < px.length; i++) out[i] = (px[i] - (i >= stride ? px[i - stride] : 0)) & 255;
  return out;
}

const header = Buffer.alloc(16);
header.write("PMRE", 0, "ascii");
header.writeUInt8(1, 4); // format version: 1 = RGBE + Up filter
header.writeUInt16LE(Number(revision), 6);
header.writeUInt16LE(ENV_SIZE, 8);
header.writeUInt16LE(width, 10);
header.writeUInt16LE(height, 12);
const payload = deflateSync(Buffer.concat([header, upFilter(toRGBE(rgba, count), width)]), { level: zc.Z_BEST_COMPRESSION });

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^room-r\d+-s\d+\.bin$/.test(f)) rmSync(join(outDir, f)); // drop stale bakes
const name = `room-r${revision}-s${ENV_SIZE}.bin`;
writeFileSync(join(outDir, name), payload);
console.log(`wrote public/env/${name} (${(payload.length / 1024).toFixed(1)} KB)`);
