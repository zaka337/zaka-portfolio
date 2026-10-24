/* Runs after every build (the "postbuild" script). It turns scripts/sw-template.js into public/sw.js:
   it lists exactly what the build produced (every page, every code file, the images the pages use, the
   3D head and the other files in public/) so the service worker can save the whole site for offline use.
   public/sw.js is generated, so it is not committed (see .gitignore).

   PWA_DISABLE=1 writes a worker that removes every saved copy and then itself, for an emergency. */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const next = join(root, ".next");
const out = join(root, "public", "sw.js");

if (process.env.PWA_DISABLE === "1") {
  writeFileSync(out, `/* PWA disabled at build time (PWA_DISABLE=1): delete every saved copy, then remove this worker. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
})()));
`);
  console.log("make-sw: PWA_DISABLE=1, wrote the kill-switch worker");
  process.exit(0);
}

if (!existsSync(join(next, "BUILD_ID"))) {
  console.warn("make-sw: no .next build found, skipping (public/sw.js not written)");
  process.exit(0);
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const url = (base, file) => "/" + relative(base, file).split(sep).map(encodeURIComponent).join("/");

// ── pages: every prerendered HTML page except the hidden and error ones ──
const prerender = JSON.parse(readFileSync(join(next, "prerender-manifest.json"), "utf8"));
const SKIP_PAGES = new Set(["/backstage", "/_not-found", "/_global-error"]);
const pages = Object.keys(prerender.routes)
  .filter((r) => !SKIP_PAGES.has(r) && !r.includes("."))
  .filter((r) => existsSync(join(next, "server", "app", r === "/" ? "index.html" : r.slice(1) + ".html")))
  .sort();
if (!pages.includes("/offline") && existsSync(join(next, "server", "app", "offline.html"))) pages.push("/offline");

// ── files: all the code, plus what the pages ask for ──
const assets = new Set();
const staticDir = join(next, "static");
for (const f of walk(staticDir)) if (!f.endsWith(".map")) assets.add("/_next/static" + url(staticDir, f));

const pub = join(root, "public");
const INCLUDE = [/^Avatar\.glb$/, /^face-still\.webp$/, /^mobile\.jpg$/, /^mobile-cutout\.webp$/, /^mini-mayhem-preview\.jpg$/, /^Zaka-Ullah-Waheed-Resume\.pdf$/, /^projects\//, /^pwa\/(icon|apple)/];
for (const f of walk(pub)) {
  const rel = relative(pub, f).split(sep).join("/");
  if (INCLUDE.some((r) => r.test(rel))) assets.add("/" + rel.split("/").map(encodeURIComponent).join("/"));
}
for (const extra of ["/manifest.webmanifest", "/icon", "/apple-icon"]) assets.add(extra);

// the optimised pictures the pages actually use (their exact addresses are in the HTML)
const htmlDir = join(next, "server", "app");
for (const f of walk(htmlDir)) {
  if (!f.endsWith(".html")) continue;
  const html = readFileSync(f, "utf8");
  for (const m of html.matchAll(/\/_next\/image\?[^"'\s<>),]+/g)) assets.add(m[0].replace(/&amp;/g, "&"));
}

const list = [...assets].sort();
const buildId = readFileSync(join(next, "BUILD_ID"), "utf8").trim();
const template = readFileSync(join(root, "scripts", "sw-template.js"), "utf8");
const version = createHash("sha1").update(buildId).update(template).update(JSON.stringify([pages, list])).digest("hex").slice(0, 10);

writeFileSync(out, template.replace("__VERSION__", () => version).replace("__PAGES__", () => JSON.stringify(pages)).replace("__ASSETS__", () => JSON.stringify(list)));

let bytes = 0;
for (const a of list) {
  const p = a.startsWith("/_next/static") ? join(next, "static", decodeURIComponent(a.slice("/_next/static".length))) : join(pub, decodeURIComponent(a.slice(1)));
  try { bytes += statSync(p).size; } catch { /* generated routes and image URLs have no file */ }
}
console.log(`make-sw: version ${version}, ${pages.length} pages, ${list.length} files (about ${(bytes / 1e6).toFixed(1)} MB) -> public/sw.js`);
