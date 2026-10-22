import * as THREE from "three";

/* Particle Zaka. Tap the cap and the head bursts into tens of thousands of dots, each one picked
   from the surface of the real head with the colour of the skin, hair or cap at that spot. They
   swirl around the cursor like a flock; hold the mouse on the face and they pull together into
   words (HIRE ME, REACT...); tap and they fly back into a head.

   The particles are drawn on their own canvas over the page, made when the burst starts and thrown
   away after the head is back, so it costs nothing the rest of the time. (The head's own canvas
   fades its neck and sides with a mask and clips below the chin, which would cut a swarm off.) All
   the movement is worked out in the vertex shader from a handful of numbers, so there is no
   per-particle work in JavaScript while it runs. */

export interface Sample { home: Float32Array; color: Float32Array; center: THREE.Vector3; n: number }

function rngFrom(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Pick `count` points on the visible surface of the head (above the neck cut), with their colours */
export function sampleHead(model: THREE.Object3D, meshes: THREE.Mesh[], cutY: number, count: number): Sample | null {
  model.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const rand = rngFrom(20261022);
  const world: Float32Array[] = [];
  const uvs: (THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null)[] = [];
  const idx: (THREE.BufferAttribute | null)[] = [];
  const tex: ({ data: Uint8ClampedArray; w: number; h: number; flip: boolean } | null)[] = [];
  const flat: THREE.Color[] = [];
  const cum: number[] = [];
  const ref: number[] = [];  // mesh index, triangle index
  let total = 0;

  meshes.forEach((mesh, mi) => {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const wp = new Float32Array(pos.count * 3);
    const sm = mesh as THREE.SkinnedMesh;
    for (let i = 0; i < pos.count; i++) {
      if (sm.isSkinnedMesh) sm.getVertexPosition(i, v); else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(mesh.matrixWorld);
      wp[i * 3] = v.x; wp[i * 3 + 1] = v.y; wp[i * 3 + 2] = v.z;
    }
    world.push(wp);
    uvs.push(geo.attributes.uv ?? null);
    idx.push(geo.index);
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    flat.push(mat.color ? mat.color.clone() : new THREE.Color(0xd9b49a));
    let t: (typeof tex)[number] = null;
    const img = mat.map?.image as CanvasImageSource | undefined;
    if (img) {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 512;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 512, 512);
        t = { data: g.getImageData(0, 0, 512, 512).data, w: 512, h: 512, flip: !!mat.map?.flipY };
      } catch { t = null; }
    }
    tex.push(t);
    const tris = geo.index ? geo.index.count / 3 : pos.count / 3;
    for (let k = 0; k < tris; k++) {
      const a = geo.index ? geo.index.getX(k * 3) : k * 3, b = geo.index ? geo.index.getX(k * 3 + 1) : k * 3 + 1, c = geo.index ? geo.index.getX(k * 3 + 2) : k * 3 + 2;
      const ax = wp[a * 3], ay = wp[a * 3 + 1], az = wp[a * 3 + 2];
      const bx = wp[b * 3], by = wp[b * 3 + 1], bz = wp[b * 3 + 2];
      const cx = wp[c * 3], cy = wp[c * 3 + 1], cz = wp[c * 3 + 2];
      if ((ay + by + cy) / 3 < cutY) continue;
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const area = 0.5 * Math.hypot(nx, ny, nz);
      if (!(area > 0)) continue;
      total += area;
      cum.push(total); ref.push(mi, k);
    }
  });
  if (!cum.length || !(total > 0)) return null;

  const home = new Float32Array(count * 3), color = new Float32Array(count * 3);
  const center = new THREE.Vector3();
  for (let p = 0; p < count; p++) {
    const r = rand() * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
    const mi = ref[lo * 2], k = ref[lo * 2 + 1];
    const wp = world[mi], ix = idx[mi], uv = uvs[mi];
    const a = ix ? ix.getX(k * 3) : k * 3, b = ix ? ix.getX(k * 3 + 1) : k * 3 + 1, c = ix ? ix.getX(k * 3 + 2) : k * 3 + 2;
    const s = Math.sqrt(rand()), r2 = rand();
    const wa = 1 - s, wb = s * (1 - r2), wc = s * r2;
    const x = wp[a * 3] * wa + wp[b * 3] * wb + wp[c * 3] * wc;
    const y = wp[a * 3 + 1] * wa + wp[b * 3 + 1] * wb + wp[c * 3 + 1] * wc;
    const z = wp[a * 3 + 2] * wa + wp[b * 3 + 2] * wb + wp[c * 3 + 2] * wc;
    home[p * 3] = x; home[p * 3 + 1] = y; home[p * 3 + 2] = z;
    center.x += x; center.y += y; center.z += z;
    let col = flat[mi];
    const T = tex[mi];
    let rr = col.r, gg = col.g, bb = col.b;
    if (T && uv) {
      const u = uv.getX(a) * wa + uv.getX(b) * wb + uv.getX(c) * wc;
      let vv = uv.getY(a) * wa + uv.getY(b) * wb + uv.getY(c) * wc;
      if (T.flip) vv = 1 - vv;
      const px = Math.min(T.w - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * T.w))), py = Math.min(T.h - 1, Math.max(0, Math.floor((((vv % 1) + 1) % 1) * T.h)));
      const o = (py * T.w + px) * 4;
      // the texture is sRGB already, and the dots are written straight to the screen
      rr = T.data[o] / 255; gg = T.data[o + 1] / 255; bb = T.data[o + 2] / 255;
    } else {
      const s2 = col.clone().convertLinearToSRGB(); rr = s2.r; gg = s2.g; bb = s2.b;
    }
    color[p * 3] = Math.min(1, rr * 1.04); color[p * 3 + 1] = Math.min(1, gg * 1.04); color[p * 3 + 2] = Math.min(1, bb * 1.04);
  }
  center.multiplyScalar(1 / count);
  return { home, color, center, n: count };
}

const WORDS = ["HIRE ME", "REACT", "NEXT.JS", "QA", "FLUTTER", "SAY HI"];

const VERT = `
attribute vec3 aHome; attribute vec3 aRand; attribute vec3 aWord; attribute vec3 aColor;
uniform float uT; uniform float uMix; uniform float uBurst; uniform float uWord; uniform float uSize; uniform float uScale;
uniform vec3 uPtr; uniform vec3 uCenter;
varying vec3 vC;
void main() {
  float m = clamp(uMix * 1.35 - aRand.x * 0.35, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 dir = normalize(aHome - uCenter + (aRand - 0.5) * 0.5);
  float b = 1.0 - exp(-uBurst * 2.6);
  vec3 burst = aHome + dir * b * (0.35 + aRand.y * 0.9);
  float ang = uT * (0.5 + aRand.y * 1.1) + aRand.z * 6.2831;
  float rad = 0.12 + aRand.x * aRand.x * 0.85;
  vec3 swirl = uPtr + vec3(cos(ang) * rad, sin(ang * 1.37 + aRand.x * 3.0) * rad * 0.8, sin(ang) * rad * 0.7);
  swirl += 0.06 * vec3(sin(uT * 1.3 + aRand.z * 20.0), cos(uT * 1.1 + aRand.x * 17.0), sin(uT * 0.9 + aRand.y * 13.0));
  vec3 freep = mix(burst, swirl, smoothstep(0.35, 1.5, uBurst));
  vec3 p = mix(aHome, freep, m);
  p = mix(p, aWord, uWord * m);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale / max(0.1, -mv.z) * (0.75 + aRand.z * 0.7);
  vC = aColor + vec3(0.28, 0.2, 0.08) * m * (0.35 + aRand.z * 0.65);
}`;
const FRAG = `
varying vec3 vC;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.18, d);
  if (a < 0.02) discard;
  gl_FragColor = vec4(vC, a);
}`;

interface Hooks { onReformed(): void; say(text: string, ms?: number): void }

export class ParticleZaka {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam: THREE.PerspectiveCamera;
  private geo = new THREE.BufferGeometry();
  private mat: THREE.ShaderMaterial;
  private n: number;
  private wordAttr: THREE.BufferAttribute;
  private perm: Uint32Array;
  private state: "burst" | "reform" = "burst";
  private t = 0;
  private burstT = 0;
  private mix = 1;
  private wordOn = false;
  private wordMix = 0;
  private wordIdx = -1;
  private wordT = 0;
  private ptr = new THREE.Vector3();
  private ptrGoal = new THREE.Vector3();
  private lastMove = 0;
  private wordCache = new Map<string, Float32Array>();
  private dead = false;
  private told = 0;
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.2);
  private onResize = () => this.resize();

  constructor(private s: Sample, src: THREE.PerspectiveCamera, private hooks: Hooks) {
    this.n = s.n;
    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;z-index:2;pointer-events:none;opacity:0;transition:opacity .25s ease";
    document.body.appendChild(c);
    this.canvas = c;
    this.renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.cam = new THREE.PerspectiveCamera(src.fov, 1, 0.1, 100);
    this.cam.position.copy(src.position); this.cam.lookAt(0, 0, 0);
    const rand = rngFrom(77);
    const R = new Float32Array(s.n * 3);
    for (let i = 0; i < R.length; i++) R[i] = rand();
    this.perm = new Uint32Array(s.n);
    for (let i = 0; i < s.n; i++) this.perm[i] = i;
    for (let i = s.n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = this.perm[i]; this.perm[i] = this.perm[j]; this.perm[j] = t; }
    this.wordAttr = new THREE.BufferAttribute(new Float32Array(s.n * 3), 3);
    this.wordAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", new THREE.BufferAttribute(s.home, 3));
    this.geo.setAttribute("aHome", new THREE.BufferAttribute(s.home, 3));
    this.geo.setAttribute("aRand", new THREE.BufferAttribute(R, 3));
    this.geo.setAttribute("aWord", this.wordAttr);
    this.geo.setAttribute("aColor", new THREE.BufferAttribute(s.color, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: {
        uT: { value: 0 }, uMix: { value: 1 }, uBurst: { value: 0 }, uWord: { value: 0 }, uSize: { value: 0.0115 }, uScale: { value: 600 },
        uPtr: { value: this.ptr }, uCenter: { value: s.center },
      },
    });
    const pts = new THREE.Points(this.geo, this.mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.ptr.copy(s.center); this.ptrGoal.copy(s.center);
    this.resize();
    window.addEventListener("resize", this.onResize);
    requestAnimationFrame(() => { this.canvas.style.opacity = "1"; });
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    this.mat.uniforms.uScale.value = this.renderer.domElement.height * 0.5 * this.cam.projectionMatrix.elements[5];
  }

  burst() {
    this.state = "burst"; this.burstT = 0; this.mix = 1; this.t = 0; this.lastMove = performance.now();
    this.hooks.say("BOOM.", 1500);
  }
  reform() {
    if (this.state === "reform") return;
    this.state = "reform"; this.wordOn = false;
  }
  words(on: boolean) {
    if (this.state === "reform") return;
    if (on && !this.wordOn) { this.wordOn = true; this.wordT = 0; this.setWord(this.wordIdx < 0 ? 0 : (this.wordIdx + 1) % WORDS.length); }
    else if (!on) this.wordOn = false;
  }
  setPointer(clientX: number, clientY: number) {
    this.ray.setFromCamera(new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1), this.cam);
    const out = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, out)) { this.ptrGoal.copy(out); this.lastMove = performance.now(); }
  }

  private wordPoints(word: string): Float32Array {
    const hit = this.wordCache.get(word);
    if (hit) return hit;
    const c = document.createElement("canvas"); c.width = 720; c.height = 200;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.fillStyle = "#fff"; g.font = "900 150px Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(word, 360, 104);
    const d = g.getImageData(0, 0, 720, 200).data;
    const pts: number[] = [];
    let minX = 1e9, maxX = -1e9;
    for (let y = 0; y < 200; y += 2) for (let x = 0; x < 720; x += 2) if (d[(y * 720 + x) * 4 + 3] > 120) { pts.push(x, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    const visW = 2 * Math.tan((this.cam.fov * Math.PI) / 360) * (this.cam.position.z - 0.2) * this.cam.aspect;
    const worldW = Math.min(2.7, visW * 0.88);
    const sc = worldW / Math.max(60, maxX - minX);
    const out = new Float32Array(pts.length / 2 * 3);
    for (let i = 0; i < pts.length / 2; i++) { out[i * 3] = (pts[i * 2] - 360) * sc; out[i * 3 + 1] = -(pts[i * 2 + 1] - 100) * sc + 0.05; out[i * 3 + 2] = 0.2; }
    this.wordCache.set(word, out);
    return out;
  }
  private setWord(i: number) {
    this.wordIdx = i;
    const w = this.wordPoints(WORDS[i]);
    const m = w.length / 3;
    const a = this.wordAttr.array as Float32Array;
    for (let p = 0; p < this.n; p++) {
      const k = this.perm[p] % m;
      a[p * 3] = w[k * 3] + (Math.random() - 0.5) * 0.012; a[p * 3 + 1] = w[k * 3 + 1] + (Math.random() - 0.5) * 0.012; a[p * 3 + 2] = w[k * 3 + 2] + (Math.random() - 0.5) * 0.05;
    }
    this.wordAttr.needsUpdate = true;
  }

  frame(dt: number, t: number) {
    if (this.dead) return;
    const h = Math.min(dt, 0.05);
    this.t += h;
    const u = this.mat.uniforms;
    u.uT.value = t;
    if (this.state === "burst") {
      this.burstT += h;
      // with nobody moving the mouse, the swarm settles around the head
      if (performance.now() - this.lastMove > 3500) this.ptrGoal.lerp(this.s.center, 1 - Math.exp(-h * 1.5));
      if (this.wordOn) {
        this.wordT += h;
        if (this.wordT > 1.7) { this.wordT = 0; this.setWord((this.wordIdx + 1) % WORDS.length); }
      }
      if (this.t > 26) this.reform();   // it never stays gone for ever
    } else {
      this.mix = Math.max(0, this.mix - h / 1.5);
      if (this.mix <= 0.02 && this.told === 0) { this.told = 1; this.hooks.onReformed(); this.canvas.style.opacity = "0"; }
    }
    this.wordMix += ((this.wordOn ? 1 : 0) - this.wordMix) * (1 - Math.exp(-h * 4.5));
    this.ptr.lerp(this.wordOn ? this.s.center : this.ptrGoal, 1 - Math.exp(-h * (this.wordOn ? 3 : 5)));
    u.uMix.value = this.mix; u.uBurst.value = this.burstT; u.uWord.value = this.wordMix;
    this.renderer.render(this.scene, this.cam);
  }

  debug() { return { count: this.s.n, state: this.state, wordOn: this.wordOn, wordIdx: this.wordIdx, word: this.wordIdx >= 0 ? WORDS[this.wordIdx] : null, mix: +this.mix.toFixed(2), t: +this.t.toFixed(1) }; }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    window.removeEventListener("resize", this.onResize);
    this.geo.dispose(); this.mat.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
