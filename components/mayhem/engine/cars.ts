import * as THREE from "three";
import { Merger, UNIT } from "./build";
import { clamp, damp } from "./util";

/* The four racers: a toy-like open car and a driver with a head far too big for the body. All
   original, all built from simple shapes in code. The head is a separate group with its own
   face parts, so replacing the face of a character later only touches `buildHead`.

   Car space: x to the left, y up, z forward. */

export type Variant = "speedster" | "tactical" | "drifter" | "wildcard";

export interface RacerSpec {
  id: string;
  name: string;
  title: string;
  blurb: string;
  variant: Variant;
  body: number; accent: number; trim: number;
  skin: number; hair: number; suit: number; hat: number; hatAccent: number;
  /** what the select screen shows (1 to 5) */
  stats: { speed: number; handling: number; drift: number };
  /** how it drives */
  phys: { maxSpeed: number; accel: number; steer: number; grip: number; mass: number };
}

export const RACERS: RacerSpec[] = [
  {
    id: "bolt", name: "BOLT", title: "The Speedster", variant: "speedster",
    blurb: "All gas, no brakes, a grin that never leaves. The fastest top speed on the island.",
    body: 0xd8262b, accent: 0xf6f3ea, trim: 0x1b1d22, skin: 0xe8b48a, hair: 0x2a1c14, suit: 0xf6f3ea, hat: 0xd8262b, hatAccent: 0xf6f3ea,
    stats: { speed: 5, handling: 3, drift: 2 },
    phys: { maxSpeed: 39, accel: 22, steer: 1.95, grip: 6.6, mass: 1.0 },
  },
  {
    id: "sarge", name: "SARGE", title: "The Tactical Racer", variant: "tactical",
    blurb: "Plans every corner like a mission. A heavy buggy that bullies the others off the line.",
    body: 0x5f6f3c, accent: 0xb8a86e, trim: 0x23271d, skin: 0xc58c5c, hair: 0x1f1a14, suit: 0x4a5632, hat: 0x6d7d45, hatAccent: 0x2f3a22,
    stats: { speed: 3, handling: 4, drift: 3 },
    phys: { maxSpeed: 35.5, accel: 21, steer: 2.1, grip: 8.0, mass: 1.3 },
  },
  {
    id: "drift", name: "DRIFT", title: "The Street Drifter", variant: "drifter",
    blurb: "Takes every corner sideways, on purpose. Slides faster than most drive.",
    body: 0x2f5dd6, accent: 0xffd23f, trim: 0x15171c, skin: 0x7b4a2d, hair: 0x14100c, suit: 0x20242c, hat: 0x20242c, hatAccent: 0xffd23f,
    stats: { speed: 3, handling: 3, drift: 5 },
    phys: { maxSpeed: 36.5, accel: 21, steer: 2.3, grip: 5.0, mass: 0.95 },
  },
  {
    id: "wild", name: "WILD", title: "The Wildcard", variant: "wildcard",
    blurb: "Nobody knows what happens next, least of all Wild. Quick off the line and slightly unhinged.",
    body: 0xf2a31a, accent: 0xe8451f, trim: 0x201a14, skin: 0xefd3b4, hair: 0x38d27a, suit: 0x6a2fb8, hat: 0xe03a3a, hatAccent: 0xffd23f,
    stats: { speed: 4, handling: 2, drift: 4 },
    phys: { maxSpeed: 37.5, accel: 24, steer: 2.0, grip: 6.0, mass: 0.9 },
  },
];

export interface Vis {
  speed: number;       // forward speed
  speedNorm: number;   // 0..1
  accel: number;       // forward acceleration (u/s^2)
  lateral: number;     // lateral acceleration
  steer: number;       // -1..1 (positive is right)
  throttle: number;
  brake: number;
  impact: number;      // 0..1, decays
  celebrate: number;   // 0..1
  pitch: number;       // radians, from the slope
  time: number;
}

export interface Rig {
  root: THREE.Group;
  tilt: THREE.Group;
  head: THREE.Group;
  wheelSpin: THREE.Group[];
  steerPivot: THREE.Group[];
  wheelR: number[];
  animate(v: Vis, dt: number, spinDelta: number, steerAngle: number): void;
  dispose(): void;
}

const std = (color: number, metal = 0.3, rough = 0.42, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, ...extra });
const lam = (color: number) => new THREE.MeshLambertMaterial({ color });

export function buildRacer(spec: RacerSpec): Rig {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const v = spec.variant;

  const mats: Record<string, THREE.Material> = {
    body: std(spec.body, 0.35, 0.34), accent: std(spec.accent, 0.2, 0.45), trim: lam(spec.trim), dark: lam(0x1a1c21),
    glass: std(0x16222e, 0.6, 0.15, { transparent: true, opacity: 0.62 }), light: new THREE.MeshBasicMaterial({ color: 0xfff3c4 }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff3b30 }), chrome: std(0xd9dde3, 0.85, 0.25), tire: lam(0x17171a),
    rim: std(0xd5d9df, 0.8, 0.3), suit: lam(spec.suit), skin: lam(spec.skin), white: lam(0xffffff), black: lam(0x111114),
    hair: lam(spec.hair), hat: std(spec.hat, 0.25, 0.4), hatAccent: std(spec.hatAccent, 0.2, 0.5), red: lam(0xc03a2b),
    lens: std(0xffc83a, 0.4, 0.2), shade: std(0x0d0f14, 0.7, 0.15), pink: lam(0xe9808c), blue: lam(0x2f7de1), gold: std(0xe6b422, 0.8, 0.3),
    mouth: lam(0x5a0f14),
  };

  // ── the car ──
  const wr = v === "wildcard" ? 0.5 : v === "tactical" ? 0.52 : 0.46;
  const rwr = v === "wildcard" ? 0.64 : wr;
  const ride = v === "tactical" ? 0.1 : v === "drifter" ? -0.05 : 0;
  const b = new Merger();
  const narrow = v === "wildcard" ? 0.9 : 1;
  b.rbox("body", 0, 0.64 + ride, 0, 2.1 * narrow, 0.62, 4.3, 0.26);
  b.rbox("body", 0, 1.0 + ride, 1.45, 1.9 * narrow, 0.34, 1.55, 0.17, 0, -0.07);
  b.rbox("body", 0, 1.02 + ride, -1.55, 1.9 * narrow, 0.36, 1.15, 0.17);
  for (const sx of [-1, 1]) b.rbox("accent", sx * 1.0 * narrow, 0.9 + ride, -0.1, 0.22, 0.32, 1.9, 0.1);
  b.box("dark", 0, 0.98 + ride, -0.2, 1.5 * narrow, 0.18, 1.7);
  b.rbox("dark", 0, 1.2 + ride, 0.72, 1.7 * narrow, 0.3, 0.45, 0.1);
  b.box("glass", 0, 1.52 + ride, 0.92, 1.7 * narrow, 0.55, 0.06, 0, -0.62);
  b.box("trim", 0, 1.8 + ride, 0.78, 1.8 * narrow, 0.08, 0.08, 0, -0.62);
  for (const sx of [-1, 1]) b.box("trim", sx * 0.85 * narrow, 1.52 + ride, 0.9, 0.06, 0.6, 0.06, 0, -0.62);
  b.rbox("dark", 0, 1.14 + ride, -0.78, 1.3, 0.55, 0.5, 0.15);
  b.rbox("dark", 0, 1.5 + ride, -1.02, 1.3, 0.95, 0.28, 0.12, 0, -0.14);
  b.rbox("trim", 0, 0.5, 2.22, 2.0 * narrow, 0.3, 0.3, 0.12);
  b.rbox("trim", 0, 0.5, -2.22, 2.0 * narrow, 0.3, 0.3, 0.12);
  for (const sx of [-1, 1]) {
    b.sphere("light", sx * 0.7 * narrow, 0.98 + ride, 2.14, 0.26, 0.2, 0.12);
    b.box("tail", sx * 0.72 * narrow, 0.98 + ride, -2.17, 0.55, 0.2, 0.08);
    b.cyl("trim", sx * 1.06 * narrow, 1.42 + ride, 0.7, 0.03, 0.3, 0, 0, Math.PI / 2 * 0.3);
    b.sphere("body", sx * 1.2 * narrow, 1.56 + ride, 0.68, 0.13, 0.09, 0.15);
  }
  if (v === "speedster") {
    b.box("accent", 0, 1.19, 1.45, 0.5, 0.02, 1.5, 0, -0.07); b.box("accent", 0, 1.22, -1.55, 0.5, 0.02, 1.15);
    b.box("trim", 0, 0.38, 2.38, 2.1, 0.08, 0.5);
    b.rbox("accent", 0, 1.78, -2.05, 2.3, 0.1, 0.6, 0.04); for (const sx of [-1, 1]) b.box("trim", sx * 0.75, 1.5, -1.95, 0.1, 0.55, 0.12);
    b.rbox("trim", 0, 1.25, 1.1, 0.7, 0.14, 0.6, 0.06);
  } else if (v === "tactical") {
    for (const sx of [-1, 1]) { b.cyl("trim", sx * 0.98, 1.62, -0.55, 0.05, 1.2); b.cyl("trim", sx * 0.98, 1.62, 0.75, 0.05, 1.2); b.cyl("trim", sx * 0.98, 2.23, 0.1, 0.05, 1.35, 0, Math.PI / 2); }
    b.cyl("trim", 0, 2.23, 0.75, 0.05, 1.96, 0, 0, Math.PI / 2); b.cyl("trim", 0, 2.23, -0.55, 0.05, 1.96, 0, 0, Math.PI / 2);
    b.cyl("tire", 0, 1.2, -2.35, 0.5, 0.35, 0, Math.PI / 2); b.cyl("rim", 0, 1.2, -2.54, 0.28, 0.08, 0, Math.PI / 2);
    for (const sx of [-1, 1]) { b.rbox("trim", sx * 0.55, 0.95, 2.48, 0.1, 0.5, 0.1, 0.03); } b.rbox("trim", 0, 1.2, 2.48, 1.4, 0.1, 0.1, 0.03);
    b.rbox("accent", 1.05, 1.28, -1.7, 0.35, 0.55, 0.5, 0.08);
    b.box("accent", 0, 0.9, 1.45, 1.6, 0.04, 0.4, 0, -0.07);
  } else if (v === "drifter") {
    for (const sx of [-1, 1]) { b.rbox("accent", sx * 1.12, 0.75, 1.5, 0.3, 0.45, 1.25, 0.12); b.rbox("accent", sx * 1.14, 0.75, -1.4, 0.34, 0.45, 1.35, 0.12); b.cyl("chrome", sx * 1.1, 0.4, -0.1, 0.08, 2.2, 0, Math.PI / 2); }
    b.rbox("trim", 0, 1.64, -2.1, 2.1, 0.1, 0.5, 0.04); for (const sx of [-1, 1]) b.box("trim", sx * 0.8, 1.4, -2.0, 0.1, 0.5, 0.12);
    b.box("accent", -0.3, 1.19, 1.45, 0.14, 0.02, 1.5, 0, -0.07); b.box("accent", 0.3, 1.19, 1.45, 0.14, 0.02, 1.5, 0, -0.07);
    b.box("accent", -0.3, 1.21, -1.55, 0.14, 0.02, 1.15); b.box("accent", 0.3, 1.21, -1.55, 0.14, 0.02, 1.15);
  } else {
    for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) b.add(UNIT.cone, "accent", sx * 0.97 * narrow, 0.95 + ride - k * 0.0, 0.5 - k * 0.55, 0, 0.16 - k * 0.025, 0.9 - k * 0.15, 0.1, Math.PI / 2, 0);
    for (const sx of [-1, 1]) b.cyl("trim", sx * 0.85, 1.7, -1.3, 0.05, 1.4, 0, 0, sx * 0.12);
    b.cyl("trim", 0, 2.3, -1.25, 0.05, 1.7, 0, 0, Math.PI / 2);
    b.cyl("chrome", 0, 1.75, -2.2, 0.03, 1.6, 0, 0.0, 0.0);
    b.rbox("red", 0.2, 2.5, -2.2, 0.55, 0.32, 0.04, 0.02);
    b.rbox("trim", 0, 0.5, 2.3, 1.6, 0.26, 0.28, 0.1);
  }
  for (const sx of [-1, 1]) for (const sz of [1.5, -1.4]) b.cyl("dark", sx * 0.95 * narrow, 0.5 + ride * 0.5, sz, 0.6, 0.28, 0, 0, Math.PI / 2);
  b.build(mats, tilt, true, false);

  // steering wheel
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 8, 18), mats.dark);
  sw.position.set(0, 1.5 + ride, 0.52); sw.rotation.x = -0.9; tilt.add(sw);

  // wheels
  const wheelSpin: THREE.Group[] = [], steerPivot: THREE.Group[] = [], wheelR: number[] = [];
  const mkWheel = (r: number, w: number) => {
    const g = new THREE.Group();
    const wm = new Merger();
    wm.cyl("tire", 0, 0, 0, r, w, 0, 0, Math.PI / 2);
    wm.cyl("rim", 0, 0, 0, r * 0.62, w + 0.03, 0, 0, Math.PI / 2);
    wm.cyl("dark", 0, 0, 0, r * 0.2, w + 0.07, 0, 0, Math.PI / 2);
    for (let k = 0; k < 5; k++) wm.box("dark", 0, 0, 0, w + 0.05, r * 1.05, 0.07, 0, (k / 5) * Math.PI);
    wm.build(mats, g, true, false);
    return g;
  };
  const places: [number, number, number, number][] = [[1.14, 1.5, wr, 0.44], [-1.14, 1.5, wr, 0.44], [1.14, -1.4, rwr, v === "wildcard" ? 0.62 : 0.44], [-1.14, -1.4, rwr, v === "wildcard" ? 0.62 : 0.44]];
  places.forEach(([x, z, r, w], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x * narrow, r, z);
    const spin = mkWheel(r, w);
    pivot.add(spin);
    root.add(pivot);
    wheelSpin.push(spin); steerPivot.push(pivot); wheelR.push(r);
    void i;
  });

  // ── the driver ──
  const torso = new Merger();
  const ty = 1.0 + ride;
  torso.rbox("suit", 0, ty + 0.5, -0.7, 1.0, 0.95, 0.58, 0.22);
  for (const sx of [-1, 1]) torso.sphere("suit", sx * 0.58, ty + 0.85, -0.7, 0.27);
  torso.cyl("skin", 0, ty + 1.05, -0.66, 0.22, 0.28);
  // arms to the wheel
  const armTo = (sx: number) => {
    const a = new THREE.Vector3(sx * 0.58, ty + 0.85, -0.68), c = new THREE.Vector3(sx * 0.3, 1.52 + ride - 0.05, 0.5);
    const mid = a.clone().add(c).multiplyScalar(0.5), len = a.distanceTo(c);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    torso.add(UNIT.cyl, "suit", mid.x, mid.y, mid.z, e.y, 0.14, len, 0.14, e.x, e.z);
    torso.sphere("skin", c.x, c.y, c.z, 0.17);
  };
  armTo(-1); armTo(1);
  torso.build(mats, tilt, true, false);

  // the head: a big sphere with a face that moves
  const head = new THREE.Group();
  const R = 0.92;
  head.position.set(0, ty + 1.05 + R * 0.88, -0.62);
  tilt.add(head);
  const hs = new Merger();
  hs.add(UNIT.sphere, "skin", 0, 0, 0, 0, R, R * 0.97, R * 0.98);
  for (const sx of [-1, 1]) { hs.sphere("skin", sx * R * 0.97, -0.05, -0.05, 0.22, 0.28, 0.16); hs.sphere("pink", sx * 0.58, -0.22, R * 0.8, 0.16, 0.11, 0.06); hs.sphere("white", sx * 0.34, 0.14, R * 0.86, 0.27, 0.32, 0.14); }
  hs.sphere("pink", 0, -0.14, R * 0.99, 0.17, 0.15, 0.15);
  // headgear and hair
  const cap = (scale: number, theta: number, key: string, z = 0, y = 0) => hs.add(new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * theta), key, 0, y, z, 0, R * scale, R * scale, R * scale);
  if (v === "speedster") {
    cap(1.08, 0.56, "hat", 0, 0.03);
    hs.cyl("hatAccent", 0, 0.66, 0.3, 0.1, 1.4, 0, Math.PI / 2 - 0.25, 0, 1, 0.6);
    hs.box("shade", 0, 0.46, R * 0.93, R * 1.5, 0.26, 0.14, 0, -0.18);
    for (const sx of [-1, 1]) { hs.cyl("hatAccent", sx * R * 1.03, 0.3, -0.1, 0.19, 0.06, 0, 0, Math.PI / 2); }
    hs.box("hatAccent", 0, -0.02, -R * 1.03, 0.9, 0.18, 0.1);
  } else if (v === "tactical") {
    cap(1.1, 0.5, "hat", 0, 0.04);
    hs.cyl("hat", 0, 0.5, 0.0, R * 1.2, 0.1, 0, 0, 0, 1, 1.2);
    for (const [bx, by, bz, s] of [[0.5, 0.8, 0.5, 0.3], [-0.4, 0.9, -0.2, 0.34], [0.1, 1.0, -0.6, 0.28], [-0.7, 0.55, 0.6, 0.24]] as const) hs.add(UNIT.sphere, "hatAccent", bx, by, bz, 0, s, s * 0.35, s);
    for (const sx of [-1, 1]) { hs.cyl("shade", sx * 0.34, 0.66, R * 0.96, 0.27, 0.12, 0, Math.PI / 2); hs.cyl("lens", sx * 0.34, 0.66, R * 1.03, 0.2, 0.05, 0, Math.PI / 2); }
    hs.cyl("black", 0, 0.66, 0.0, R * 1.05, 0.13, 0, 0, 0, 1, 1.05);
    for (const sx of [-1, 1]) hs.box("black", sx * 0.78, -0.35, 0.35, 0.06, 0.8, 0.06, 0, 0, sx * 0.3);
  } else if (v === "drifter") {
    cap(1.07, 0.5, "hat", 0, 0.05);
    hs.box("hatAccent", 0, 0.18, -R * 1.05, 0.9, 0.07, 0.75, 0, 0.25);
    hs.box("hatAccent", 0, 0.5, -R * 0.2, 0.18, 0.18, 0.18);
    for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 2.4; hs.add(UNIT.cone, "hair", Math.sin(a) * R * 1.0, 0.1, Math.cos(a) * R * 0.2 - R * 0.85 + 0.8, 0, 0.2, 0.7, 0.2, 0, -Math.sin(a) * 0.6); }
    for (const sx of [-1, 1]) hs.rbox("shade", sx * 0.34, 0.14, R * 0.93, 0.62, 0.34, 0.12, 0.08);
    hs.box("shade", 0, 0.17, R * 0.93, 0.16, 0.06, 0.1);
    hs.sphere("gold", 0.26, -0.48, R * 0.92, 0.07);
  } else {
    for (let k = 0; k < 7; k++) { const t = k / 6; hs.add(UNIT.cone, "hair", 0, R * 0.95 + Math.sin(t * Math.PI) * 0.1 - 0.02, (t - 0.5) * 1.5, 0, 0.17, 0.5 + Math.sin(t * Math.PI) * 0.7, 0.2, -0.2 + t * 0.4); }
    hs.cyl("hat", 0, 0.5, 0.0, R * 1.02, 0.2, 0, 0, 0, 1, 1.02);
    hs.sphere("hat", -R * 0.95, 0.55, -0.4, 0.22);
    for (const sx of [-1, 1]) { hs.box("blue", sx * 0.62, -0.18, R * 0.82, 0.45, 0.07, 0.04, 0, 0, sx * 0.4); hs.box("blue", sx * 0.58, -0.05, R * 0.86, 0.4, 0.06, 0.04, 0, 0, sx * 0.4); }
    hs.sphere("gold", -0.16, -0.5, R * 0.92, 0.06);
  }
  hs.build(mats, head, true, false);

  // the parts of the face that move
  const pupils: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(UNIT.sphere, mats.black);
    p.scale.set(0.13, 0.16, 0.08);
    p.position.set(sx * 0.34, 0.12, R * 0.86 + 0.12);
    head.add(p); pupils.push(p);
  }
  const brows: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const bw = new THREE.Mesh(UNIT.box, mats.hair);
    bw.scale.set(0.46, 0.1, 0.1);
    bw.position.set(sx * 0.36, 0.58, R * 0.86);
    head.add(bw); brows.push(bw);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14, Math.PI), mats.mouth);
  smile.position.set(0, -0.28, R * 0.93); smile.rotation.z = Math.PI;
  head.add(smile);
  const open = new THREE.Mesh(UNIT.sphere, mats.mouth);
  open.position.set(0, -0.42, R * 0.9); open.scale.set(0.3, 0.05, 0.09);
  head.add(open);
  const teeth = new THREE.Mesh(UNIT.box, mats.white);
  teeth.position.set(0, -0.33, R * 0.99); teeth.scale.set(0.34, 0.07, 0.04);
  head.add(teeth);

  // animation state (springs)
  const st = { pitch: 0, roll: 0, yaw: 0, bounce: 0, open: 0.1, brow: 0, look: 0, tiltP: 0, tiltR: 0, imp: 0 };
  const animate = (vis: Vis, dt: number, spinDelta: number, steerAngle: number) => {
    // body: leans into the corner, rocks with acceleration, follows the slope
    st.tiltP = damp(st.tiltP, clamp(-vis.accel * 0.0042, -0.07, 0.07) + vis.pitch, 9, dt);
    st.tiltR = damp(st.tiltR, clamp(-vis.lateral * 0.0038, -0.1, 0.1), 9, dt);
    tilt.rotation.x = st.tiltP;
    tilt.rotation.z = st.tiltR;
    tilt.position.y = Math.sin(vis.time * 38 + 1) * 0.012 * vis.speedNorm + vis.impact * Math.sin(vis.time * 55) * 0.05;
    // wheels
    for (let i = 0; i < 4; i++) {
      wheelSpin[i].rotation.x += spinDelta / wheelR[i];
      if (i < 2) steerPivot[i].rotation.y = -steerAngle * 0.45;
    }
    sw.rotation.z = -steerAngle * 2.2;
    // the head: lags behind the body, looks into the corner, nods on the brakes, bobs when it is happy
    st.pitch = damp(st.pitch, clamp(-vis.accel * 0.011 + vis.brake * 0.12, -0.3, 0.3) - vis.impact * 0.25, 7, dt);
    st.roll = damp(st.roll, clamp(vis.lateral * 0.012, -0.35, 0.35), 7, dt);
    st.yaw = damp(st.yaw, -steerAngle * 0.9 + (vis.celebrate > 0 ? Math.sin(vis.time * 9) * 0.5 : 0), 8, dt);
    st.bounce = damp(st.bounce, Math.abs(Math.sin(vis.time * 8)) * 0.14 * vis.celebrate + vis.speedNorm * Math.sin(vis.time * 30) * 0.02, 12, dt);
    head.rotation.set(st.pitch, st.yaw, st.roll);
    head.position.y = ty + 1.05 + R * 0.88 + st.bounce;
    st.imp = damp(st.imp, vis.impact, 20, dt);
    head.scale.set(1 + st.imp * 0.1, 1 - st.imp * 0.14, 1 + st.imp * 0.1);
    // the face
    st.look = damp(st.look, steerAngle, 8, dt);
    for (let i = 0; i < 2; i++) pupils[i].position.x = (i ? 1 : -1) * 0.34 - st.look * 0.1;
    st.brow = damp(st.brow, vis.impact > 0.25 ? -0.5 : 0.25 + vis.speedNorm * 0.35 - vis.celebrate * 0.7, 10, dt);
    for (let i = 0; i < 2; i++) {
      brows[i].rotation.z = (i ? -1 : 1) * st.brow * 0.7;
      brows[i].position.y = 0.58 + (vis.impact > 0.25 ? 0.12 : 0) + (vis.celebrate > 0 ? 0.1 : 0);
    }
    const wantOpen = clamp(vis.throttle * 0.25 + vis.speedNorm * 0.35 + vis.impact * 1.1 + vis.celebrate * 0.9 + vis.brake * 0.4, 0.05, 1);
    st.open = damp(st.open, wantOpen, 12, dt);
    open.scale.set(0.3, 0.04 + st.open * 0.3, 0.09);
    open.position.y = -0.42 - st.open * 0.05;
    teeth.visible = st.open > 0.5;
    smile.visible = st.open < 0.28;
  };

  const dispose = () => {
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && m.geometry !== UNIT.sphere && m.geometry !== UNIT.box) m.geometry.dispose(); });
    for (const m of Object.values(mats)) m.dispose();
  };

  return { root, tilt, head, wheelSpin, steerPivot, wheelR, animate, dispose };
}
