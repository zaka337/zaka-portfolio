import * as THREE from "three";
import { sampleHead, ParticleZaka } from "./particleZaka";
import { takeFaceAsk } from "@/lib/faceAct";

/* Things to do with Zaka's face. The head is one scanned skin on a body skeleton, with no facial
   rig, so these are made with shaders and springs rather than with expressions:

     squish   drag the cheeks, mouth or chin and the skin stretches like putty, then wobbles back
     boop     tap the nose: it pushes in, springs out and honks
     looks    tap the eyes: a scan line sweeps down and the head becomes gold, a hologram, a thermal
              camera, an X-ray or a cartoon (and back again)
     dissolve tap the cap: the head bursts into tens of thousands of particles that swirl around the
              cursor, spell words when held, and fly back together (components/face/particleZaka.ts)

   The squish and the looks are one small shader patch shared by every skin, hair and cap material
   (`patchMaterial`), driven by a few shared uniforms. Where on the face a press lands decides what
   it does (`regionAt`). Nothing here runs per frame unless something is happening. */

export const LOOKS = ["REAL", "GOLD", "HOLOGRAM", "THERMAL", "X-RAY", "TOON"] as const;
export type Region = "cap" | "eyes" | "nose" | "squish" | "turn";

const U = {
  uSqPos: { value: new THREE.Vector3() },
  uSqDisp: { value: new THREE.Vector3() },
  uSqRad: { value: 0.3 },
  uLookA: { value: 0 },
  uLookB: { value: 0 },
  uSweep: { value: 2 },
  uTime: { value: 0 },
};

const VERT_DECL = "uniform vec3 uSqPos; uniform vec3 uSqDisp; uniform float uSqRad;";
const VERT_MAIN = `
if (dot(uSqDisp, uSqDisp) > 1e-7) {
  vec3 zkW = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vec3 zkD = zkW - uSqPos;
  float zkF = exp(-dot(zkD, zkD) / (uSqRad * uSqRad));
  transformed += inverse(mat3(modelMatrix)) * (uSqDisp * zkF);
}`;
const FRAG_DECL = `
uniform float uLookA; uniform float uLookB; uniform float uSweep; uniform float uTime;
vec3 zkLook(float mode, vec3 c, vec3 n, vec3 v, float vy) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float fr = pow(1.0 - abs(dot(n, v)), 2.4);
  if (mode < 0.5) return c;
  if (mode < 1.5) {
    float spec = pow(max(dot(reflect(-v, n), normalize(vec3(0.4, 0.8, 0.5))), 0.0), 16.0);
    return vec3(1.0, 0.70, 0.22) * (0.18 + 1.1 * pow(l, 0.8)) + vec3(1.0, 0.92, 0.65) * (spec * 0.75 + fr * 0.3);
  }
  if (mode < 2.5) {
    float lines = 0.62 + 0.38 * sin(vy * 80.0 + uTime * 4.0);
    float flick = 0.94 + 0.06 * sin(uTime * 37.0);
    return (vec3(0.10, 0.62, 0.85) * (0.3 + 0.9 * l) + vec3(0.35, 1.0, 1.0) * fr * 0.9) * lines * flick;
  }
  if (mode < 3.5) {
    float t = clamp(l * 1.3 + fr * 0.12, 0.0, 1.0);
    vec3 a = vec3(0.02, 0.0, 0.18), b = vec3(0.45, 0.0, 0.62), cc = vec3(0.95, 0.15, 0.2), d = vec3(1.0, 0.76, 0.1), e = vec3(1.0, 1.0, 0.86);
    return t < 0.25 ? mix(a, b, t * 4.0) : t < 0.5 ? mix(b, cc, (t - 0.25) * 4.0) : t < 0.75 ? mix(cc, d, (t - 0.5) * 4.0) : mix(d, e, (t - 0.75) * 4.0);
  }
  if (mode < 4.5) {
    return vec3(0.02, 0.07, 0.13) + vec3(0.42, 0.85, 1.0) * (fr * 1.25 + 0.10 * l) + vec3(0.2, 0.5, 0.8) * (0.5 + 0.5 * sin(vy * 120.0)) * 0.05;
  }
  if (fr > 0.6) return vec3(0.03);
  return floor(c * 4.0 + 0.5) / 4.0 * 1.08;
}`;
const FRAG_MAIN = `
if (uLookA > 0.5 || uLookB > 0.5) {
  vec3 zkN = normalize(normal);
  vec3 zkV = normalize(vViewPosition);
  float zkY = -vViewPosition.y;
  vec3 zkA = zkLook(uLookA, gl_FragColor.rgb, zkN, zkV, zkY);
  vec3 zkB = zkLook(uLookB, gl_FragColor.rgb, zkN, zkV, zkY);
  float zkK = smoothstep(-0.04, 0.04, zkY - uSweep);
  float zkLine = exp(-pow((zkY - uSweep) * 26.0, 2.0)) * step(-1.5, uSweep) * step(uSweep, 1.4);
  gl_FragColor.rgb = mix(zkA, zkB, zkK) + vec3(0.35, 1.0, 1.0) * zkLine * 0.85;
}`;

/** Add the squish and the looks to a skin, hair or cap material. Called once, before it is compiled. */
export function patchMaterial(m: THREE.Material) {
  if (!(m instanceof THREE.MeshStandardMaterial)) return;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSqPos = U.uSqPos; shader.uniforms.uSqDisp = U.uSqDisp; shader.uniforms.uSqRad = U.uSqRad;
    shader.uniforms.uLookA = U.uLookA; shader.uniforms.uLookB = U.uLookB; shader.uniforms.uSweep = U.uSweep; shader.uniforms.uTime = U.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <skinning_vertex>", `#include <skinning_vertex>\n${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
      .replace("#include <colorspace_fragment>", `#include <colorspace_fragment>\n${FRAG_MAIN}`);
  };
  m.customProgramCacheKey = () => "zk-face-fx-1";
}

/* ── state ── */
interface Ctx {
  camera: THREE.PerspectiveCamera;
  gl: THREE.WebGLRenderer;
  model: THREE.Object3D;       // the loaded avatar (hidden while it is particles)
  meshes: THREE.Mesh[];
  cutY: number;
}
let ctx: Ctx | null = null;
let calmNow = false;

const press = { active: false, anchor: new THREE.Vector3(), depth: 0 };
const d = new THREE.Vector3(), vel = new THREE.Vector3(), target = new THREE.Vector3();
let look = 0;
let sweepT = -1;
let particles: ParticleZaka | null = null;
let frozen = false;
let boops = 0;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tmpV = new THREE.Vector3();
const plane = new THREE.Plane();

export interface FaceEvents { say(text: string, ms?: number): void; sound(name: "honk" | "whoosh" | "chime" | "tick"): void }
let ev: FaceEvents = { say() {}, sound() {} };

export const faceFx = {
  get ready() { return !!ctx; },
  get frozen() { return frozen; },
  get dissolved() { return !!particles; },
  get look() { return look; },
  get squishing() { return press.active || d.lengthSq() > 1e-6; },
  setCalm(c: boolean) { calmNow = c; },
  /** For tests */
  debug() {
    return {
      look, lookA: U.uLookA.value, lookB: U.uLookB.value, sweep: U.uSweep.value, disp: d.length(), dispMax: U.uSqDisp.value.length(), pressing: press.active,
      dissolved: !!particles, frozen, modelVisible: ctx ? ctx.model.visible : null, calm: calmNow, boops,
      words: particles ? particles.debug() : null,
    };
  },

  attach(c: Ctx, events: FaceEvents) {
    ctx = c; ev = events;
    if (/[?&]test(&|$)/.test(location.search)) (window as unknown as { __faceFx?: unknown }).__faceFx = faceFx;
    window.addEventListener("zk-face", onFace);
    window.addEventListener("pointermove", onMove, { passive: true });
    // Something (the terminal, the search) asked for this before the head was ready
    const ask = takeFaceAsk();
    if (ask) window.setTimeout(() => { if (ctx) onFace(new CustomEvent("zk-face", { detail: ask })); }, 1200);
  },
  detach() {
    window.removeEventListener("zk-face", onFace);
    window.removeEventListener("pointermove", onMove);
    particles?.dispose(); particles = null;
    if (ctx) ctx.model.visible = true;
    frozen = false; ctx = null;
    U.uSqDisp.value.set(0, 0, 0); U.uLookA.value = U.uLookB.value = 0; U.uSweep.value = 2; look = 0; sweepT = -1;
    d.set(0, 0, 0); vel.set(0, 0, 0); press.active = false;
  },

  /** Which part of the face is this? px and py are 0..1 across the face's hit area (from its top left). */
  regionAt(px: number, py: number): Region {
    const dx = Math.abs(px - 0.5);
    if (py < 0.32 && dx < 0.44) return "cap";
    if (py >= 0.34 && py < 0.5 && dx < 0.3) return "eyes";
    if (py >= 0.5 && py < 0.68 && dx < 0.11) return "nose";
    if (py >= 0.4 && (dx >= 0.2 || py >= 0.7)) return "squish";
    return "turn";
  },

  /* ── squish and boop ── */
  pick(clientX: number, clientY: number): THREE.Vector3 | null {
    if (!ctx) return null;
    const r = ctx.gl.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, ctx.camera);
    const hits = raycaster.intersectObjects(ctx.meshes, false);
    if (hits.length) return hits[0].point.clone();
    plane.set(new THREE.Vector3(0, 0, 1), -0.12);
    const out = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, out) ? out : null;
  },
  squishStart(clientX: number, clientY: number) {
    const p = this.pick(clientX, clientY);
    if (!p) return false;
    press.active = true; press.anchor.copy(p); press.depth = p.z;
    U.uSqPos.value.copy(p); U.uSqRad.value = 0.34;
    target.set(0, 0, 0);
    return true;
  },
  squishMove(clientX: number, clientY: number) {
    if (!press.active || !ctx) return;
    const r = ctx.gl.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, ctx.camera);
    plane.set(new THREE.Vector3(0, 0, 1), -press.depth);
    if (!raycaster.ray.intersectPlane(plane, tmpV)) return;
    target.copy(tmpV).sub(press.anchor).multiplyScalar(0.95);
    target.z = Math.min(0.12, target.length() * 0.2);
    if (target.length() > 0.42) target.setLength(0.42);
  },
  squishEnd() { press.active = false; target.set(0, 0, 0); },
  boop(clientX: number, clientY: number) {
    if (!ctx) return;
    const p = this.pick(clientX, clientY);
    if (!p) return;
    U.uSqPos.value.copy(p); U.uSqRad.value = 0.17;
    d.set(0, 0, 0); target.set(0, 0, 0);
    vel.copy(ctx.camera.position).sub(p).normalize().multiplyScalar(-6.5).add(tmpV.set(0, -1.2, 0));
    press.active = false;
    boops++;
    ev.sound("honk");
  },

  /* ── looks ── */
  nextLook() { faceFx.setLook((look + 1) % LOOKS.length); },
  setLook(i: number) {
    if (!ctx) return;
    const next = ((i % LOOKS.length) + LOOKS.length) % LOOKS.length;
    U.uLookA.value = look; U.uLookB.value = next;
    look = next;
    sweepT = calmNow ? 1 : 0;
    U.uSweep.value = calmNow ? -2 : 1.0;
    ev.sound("tick");
    ev.say(next === 0 ? "BACK TO NORMAL." : `${LOOKS[next]} MODE.`, 2000);
  },

  /* ── dissolve ── */
  dissolve() {
    if (!ctx || particles) return;
    if (calmNow) { ev.say("CALM MODE IS ON, SO NO FIREWORKS.", 2600); return; }
    const s = sampleHead(ctx.model, ctx.meshes, ctx.cutY, matchMedia("(pointer: coarse)").matches ? 16000 : 34000);
    if (!s) return;
    frozen = true;
    particles = new ParticleZaka(s, ctx.camera, {
      onReformed: () => {
        if (ctx) ctx.model.visible = true;
        window.setTimeout(() => { particles?.dispose(); particles = null; frozen = false; }, 380);
      },
      say: (t, ms) => ev.say(t, ms),
    });
    ctx.model.visible = false;
    ev.sound("whoosh");
    particles.burst();
  },
  reform() { if (particles) { particles.reform(); ev.sound("whoosh"); } },
  /** Pointer held on the face while it is particles: spell words */
  holdWords(on: boolean) { particles?.words(on); },
  setPointer(clientX: number, clientY: number) { particles?.setPointer(clientX, clientY); },

  /** Every frame (from the avatar scene's render loop) */
  frame(dt: number, t: number) {
    U.uTime.value = t;
    const h = Math.min(dt, 0.033);
    if (press.active || vel.lengthSq() > 1e-5 || d.lengthSq() > 1e-7 || target.lengthSq() > 1e-7) {
      const k = press.active ? 220 : 125, c = press.active ? 24 : 3.4;
      const steps = Math.max(1, Math.ceil(h / 0.008));
      const sdt = h / steps;
      for (let i = 0; i < steps; i++) {
        vel.x += ((target.x - d.x) * k - vel.x * c) * sdt;
        vel.y += ((target.y - d.y) * k - vel.y * c) * sdt;
        vel.z += ((target.z - d.z) * k - vel.z * c) * sdt;
        d.addScaledVector(vel, sdt);
      }
      if (!press.active && d.lengthSq() < 1e-7 && vel.lengthSq() < 1e-5) { d.set(0, 0, 0); vel.set(0, 0, 0); }
      U.uSqDisp.value.copy(d);
    }
    if (sweepT >= 0) {
      sweepT += dt / 1.1;
      const e = sweepT < 0.5 ? 2 * sweepT * sweepT : 1 - Math.pow(-2 * sweepT + 2, 2) / 2;
      if (sweepT >= 1) { U.uSweep.value = -2; U.uLookA.value = U.uLookB.value; sweepT = -1; }
      else U.uSweep.value = 1.0 - 2.0 * Math.min(1, Math.max(0, e));
    }
    particles?.frame(dt, t);
  },
};

function onMove(e: PointerEvent) { particles?.setPointer(e.clientX, e.clientY); }

/** The terminal, the search and other parts of the page can ask for these */
function onFace(e: Event) {
  const det = (e as CustomEvent<{ act: string; name?: string }>).detail;
  if (!det || !ctx) return;
  if (det.act === "dissolve") faceFx.dissolve();
  else if (det.act === "reform") faceFx.reform();
  else if (det.act === "look") {
    const i = det.name ? LOOKS.findIndex((n) => n.toLowerCase().replace("-", "") === det.name!.toLowerCase().replace("-", "")) : -1;
    if (det.name && i < 0) { ev.say(`TRY: ${LOOKS.join(", ")}`, 3000); return; }
    faceFx.setLook(i >= 0 ? i : (look + 1) % LOOKS.length);
  } else if (det.act === "boop") {
    const r = ctx.gl.domElement.getBoundingClientRect();
    faceFx.boop(r.left + r.width / 2, r.top + r.height * 0.5);
    ev.say("HONK!", 1200);
  }
}
