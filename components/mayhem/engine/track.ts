import * as THREE from "three";
import { clamp, wrapAngle } from "./util";

/* The circuit: a closed loop around a bay. It starts on the straight beside the military base,
   climbs the east coast, crosses the bay on a long bridge, comes down on the western shore and
   returns through a flowing S. Everything else in the world (road, barriers, bridge, base,
   terrain, checkpoints, the AI's waypoints) is built from the samples made here, so the track
   is one connected, driveable route by construction.

   Conventions used everywhere: x east, z south, y up. A heading h points the car along
   (sin h, cos h). The right-hand side of the direction of travel is (-cos h, sin h), and a
   signed lateral offset d is measured to the right. */

export const SC = 0.8; // the control points below are drawn on a 600-unit board; this scales them

// x, z, elevation
const CONTROL: [number, number, number][] = [
  [-120, 122, 0], [-40, 124, 0], [60, 118, 0], [150, 100, 1.5], [230, 60, 4.5], [272, -10, 7.5],
  [262, -80, 8.5], [215, -128, 7.5], [140, -150, 6], [40, -158, 8.5], [-60, -160, 10], [-150, -152, 7.5],
  [-225, -122, 3], [-268, -60, 1], [-250, 10, 0], [-195, 45, 0], [-165, 85, 0], [-190, 118, 0],
];

export interface Proj {
  i: number;     // sample the car is beside
  t: number;     // 0..1 along that segment
  d: number;     // signed lateral offset (right is positive)
  x: number; z: number; y: number;
  dist: number;  // distance to the centre line
}
export const makeProj = (): Proj => ({ i: 0, t: 0, d: 0, x: 0, z: 0, y: 0, dist: 0 });

export class Track {
  readonly n: number;
  readonly length: number;
  readonly ds: number;
  readonly halfW = 8;
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly y: Float32Array;
  readonly tx: Float32Array;   // unit tangent
  readonly tz: Float32Array;
  readonly curv: Float32Array; // signed curvature, positive = turning left
  readonly bridge: Uint8Array;
  readonly startIdx: number;
  readonly bridgeFrom: number;
  readonly bridgeTo: number;
  readonly bounds = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 };
  private readonly cell = 16;
  private readonly grid = new Map<number, number[]>();

  constructor() {
    const pts = CONTROL.map(([x, z, y]) => new THREE.Vector3(x * SC, y, z * SC));
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    const len = curve.getLength();
    const n = Math.round(len);
    const sp = curve.getSpacedPoints(n);
    this.n = n;
    this.length = len;
    this.ds = len / n;
    this.x = new Float32Array(n); this.z = new Float32Array(n); this.y = new Float32Array(n);
    this.tx = new Float32Array(n); this.tz = new Float32Array(n);
    this.curv = new Float32Array(n);
    this.bridge = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      this.x[i] = sp[i].x; this.y[i] = sp[i].y; this.z[i] = sp[i].z;
      const b = this.bounds;
      b.minX = Math.min(b.minX, sp[i].x); b.maxX = Math.max(b.maxX, sp[i].x);
      b.minZ = Math.min(b.minZ, sp[i].z); b.maxZ = Math.max(b.maxZ, sp[i].z);
    }
    const heading = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i + n - 2) % n, c = (i + 2) % n;
      const dx = this.x[c] - this.x[a], dz = this.z[c] - this.z[a];
      const l = Math.hypot(dx, dz) || 1;
      this.tx[i] = dx / l; this.tz[i] = dz / l;
      heading[i] = Math.atan2(this.tx[i], this.tz[i]);
    }
    // curvature, smoothed over a few samples so the AI does not twitch
    const raw = new Float32Array(n);
    for (let i = 0; i < n; i++) raw[i] = wrapAngle(heading[(i + 3) % n] - heading[(i + n - 3) % n]) / (6 * this.ds);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = -3; k <= 3; k++) s += raw[(i + k + n) % n];
      this.curv[i] = s / 7;
    }
    // the bridge: the stretch that crosses the bay in the north
    let bf = n, bt = -1;
    for (let i = 0; i < n; i++) {
      const on = this.x[i] < 150 * SC && this.x[i] > -150 * SC && this.z[i] < -130 * SC;
      this.bridge[i] = on ? 1 : 0;
      if (on) { bf = Math.min(bf, i); bt = Math.max(bt, i); }
    }
    this.bridgeFrom = bf; this.bridgeTo = bt;
    // the start line: beside the second control point, on the long straight
    let best = 1e9, si = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(this.x[i] - -40 * SC, this.z[i] - 124 * SC);
      if (d < best) { best = d; si = i; }
    }
    this.startIdx = si;
    // a lookup grid so any point in the world can find its nearest stretch of road
    for (let i = 0; i < n; i++) {
      const k = this.key(Math.floor(this.x[i] / this.cell), Math.floor(this.z[i] / this.cell));
      const list = this.grid.get(k);
      if (list) list.push(i); else this.grid.set(k, [i]);
    }
  }

  private key(ix: number, iz: number) { return (ix + 512) * 1024 + (iz + 512); }
  wrap(i: number) { return ((i % this.n) + this.n) % this.n; }
  heading(i: number) { const k = this.wrap(i); return Math.atan2(this.tx[k], this.tz[k]); }
  /** A point beside the road: lateral is positive to the right. `i` may be fractional (it is
      interpolated between two samples) and may be negative or past the end (it wraps). */
  at(i: number, lateral = 0, out = { x: 0, z: 0, y: 0, h: 0 }) {
    const f = Math.floor(i), t = i - f;
    const a = this.wrap(f), b = (a + 1) % this.n;
    const x = this.x[a] + (this.x[b] - this.x[a]) * t;
    const z = this.z[a] + (this.z[b] - this.z[a]) * t;
    let tx = this.tx[a] + (this.tx[b] - this.tx[a]) * t, tz = this.tz[a] + (this.tz[b] - this.tz[a]) * t;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    out.x = x + -tz * lateral;
    out.z = z + tx * lateral;
    out.y = this.y[a] + (this.y[b] - this.y[a]) * t;
    out.h = Math.atan2(tx, tz);
    return out;
  }

  /** Where is this point relative to the road? `hint` is the sample it was near last time. */
  project(px: number, pz: number, hint: number, out: Proj): Proj {
    const n = this.n;
    let bestD = 1e18, bi = hint, bt = 0;
    for (let k = -8; k <= 14; k++) {
      const i = (hint + k + n) % n, j = (i + 1) % n;
      const sx = this.x[j] - this.x[i], sz = this.z[j] - this.z[i];
      const l2 = sx * sx + sz * sz || 1;
      const t = clamp(((px - this.x[i]) * sx + (pz - this.z[i]) * sz) / l2, 0, 1);
      const cx = this.x[i] + sx * t - px, cz = this.z[i] + sz * t - pz;
      const d2 = cx * cx + cz * cz;
      if (d2 < bestD) { bestD = d2; bi = i; bt = t; }
    }
    if (bestD > 40 * 40) return this.projectGlobal(px, pz, out);
    return this.fill(px, pz, bi, bt, out);
  }

  projectGlobal(px: number, pz: number, out: Proj): Proj {
    const n = this.n;
    const cx = Math.floor(px / this.cell), cz = Math.floor(pz / this.cell);
    let bestD = 1e18, bi = 0, bt = 0;
    const test = (i: number) => {
      const j = (i + 1) % n;
      const sx = this.x[j] - this.x[i], sz = this.z[j] - this.z[i];
      const l2 = sx * sx + sz * sz || 1;
      const t = clamp(((px - this.x[i]) * sx + (pz - this.z[i]) * sz) / l2, 0, 1);
      const dx = this.x[i] + sx * t - px, dz = this.z[i] + sz * t - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; bi = i; bt = t; }
    };
    for (let ring = 1; ring <= 14 && bestD > 1e17; ring++) {
      for (let a = -ring; a <= ring; a++) {
        for (let b = -ring; b <= ring; b++) {
          if (Math.max(Math.abs(a), Math.abs(b)) !== ring && ring > 1) continue;
          const list = this.grid.get(this.key(cx + a, cz + b));
          if (list) for (const i of list) test(i);
        }
      }
    }
    if (bestD > 1e17) for (let i = 0; i < n; i++) test(i);
    return this.fill(px, pz, bi, bt, out);
  }

  private fill(px: number, pz: number, i: number, t: number, out: Proj): Proj {
    const j = (i + 1) % this.n;
    const cx = this.x[i] + (this.x[j] - this.x[i]) * t;
    const cz = this.z[i] + (this.z[j] - this.z[i]) * t;
    const tx = this.tx[i] + (this.tx[j] - this.tx[i]) * t, tz = this.tz[i] + (this.tz[j] - this.tz[i]) * t;
    const tl = Math.hypot(tx, tz) || 1;
    out.i = i; out.t = t;
    out.d = (px - cx) * (-tz / tl) + (pz - cz) * (tx / tl);
    out.x = cx; out.z = cz;
    out.y = this.y[i] + (this.y[j] - this.y[i]) * t;
    out.dist = Math.hypot(px - cx, pz - cz);
    return out;
  }

  /** Distance along the lap from the start line, 0..length */
  sOf(i: number, t = 0) { return ((i - this.startIdx + t + this.n) % this.n) * this.ds; }
}
