import * as THREE from "three";

/* Effects: tyre smoke, sparks and confetti share one pool of soft round particles (one draw
   call, nothing allocated while racing), and skid marks are a ring of quads laid on the road. */

export class Particles {
  readonly points: THREE.Points;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly vel: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly grow: Float32Array;
  private readonly grav: Float32Array;
  private readonly a0: Float32Array;
  private readonly s0: Float32Array;
  private head = 0;
  private readonly mat: THREE.ShaderMaterial;

  constructor(max: number) {
    this.n = max;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.age = new Float32Array(max).fill(99); this.life = new Float32Array(max).fill(1);
    this.grow = new Float32Array(max); this.grav = new Float32Array(max); this.a0 = new Float32Array(max); this.s0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 600 } },
      vertexShader: "attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale; varying vec3 vC; varying float vA; void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }",
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  setScale(viewportHeight: number, camera: THREE.PerspectiveCamera) {
    this.mat.uniforms.uScale.value = viewportHeight * 0.5 * camera.projectionMatrix.elements[5];
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number, r: number, g: number, b: number, grow = 0, grav = 0, alpha = 0.5) {
    const i = this.head; this.head = (this.head + 1) % this.n;
    const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b;
    this.s0[i] = size; this.size[i] = size; this.a0[i] = alpha; this.alpha[i] = alpha;
    this.age[i] = 0; this.life[i] = life; this.grow[i] = grow; this.grav[i] = grav;
  }

  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      this.age[i] += dt;
      const t = this.age[i] / this.life[i], k = i * 3;
      this.vel[k + 1] -= this.grav[i] * dt;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      this.size[i] = this.s0[i] * (1 + this.grow[i] * t);
      this.alpha[i] = this.a0[i] * (1 - t) * (t < 0.08 ? t / 0.08 : 1);
    }
    const g = this.points.geometry;
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
  }

  clear() { this.age.fill(99); this.alpha.fill(0); this.size.fill(0); }
  dispose() { this.points.geometry.dispose(); this.mat.dispose(); }
}

export class Skids {
  readonly mesh: THREE.Mesh;
  private readonly max: number;
  private readonly pos: Float32Array;
  private head = 0;
  private filled = 0;
  private readonly last = new Map<number, { lx: number; lz: number; rx: number; rz: number; y: number }>();

  constructor(max = 1600) {
    this.max = max;
    this.pos = new Float32Array(max * 4 * 3);
    const idx = new Uint16Array(max * 6);
    for (let i = 0; i < max; i++) { const v = i * 4, k = i * 6; idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], k); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    const m = new THREE.MeshBasicMaterial({ color: 0x0b0b0e, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  /** A wheel is leaving a mark at (x, z); (sx, sz) is half the mark's width, across the car */
  mark(key: number, x: number, y: number, z: number, sx: number, sz: number) {
    const prev = this.last.get(key);
    const cur = { lx: x - sx, lz: z - sz, rx: x + sx, rz: z + sz, y: y + 0.07 };
    if (prev) {
      const i = this.head * 12;
      this.pos.set([prev.lx, prev.y, prev.lz, prev.rx, prev.y, prev.rz, cur.lx, cur.y, cur.lz, cur.rx, cur.y, cur.rz], i);
      this.head = (this.head + 1) % this.max;
      this.filled = Math.min(this.max, this.filled + 1);
      const a = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
      a.needsUpdate = true;
      this.mesh.geometry.setDrawRange(0, this.filled * 6);
    }
    this.last.set(key, cur);
  }
  lift(key: number) { this.last.delete(key); }
  clear() { this.head = 0; this.filled = 0; this.last.clear(); this.mesh.geometry.setDrawRange(0, 0); }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
