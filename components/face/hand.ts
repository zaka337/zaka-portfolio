import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* The hand the home page head rests in: a polished gold hand with a black lacquer cuff, built from
   code (no model to download), holding the head like a sculpture. Palm up, the neck sinks into the
   hollow of the palm, the fingers curl up round it, the thumb comes up in front, and the wrist runs
   off to one side and ends in the cuff.
   Everything is measured in world units and hangs from ONE origin: the middle of the cut neck, at the
   height of the cut (the head is clipped just under the chin; see neckDrop). The palm closes round
   the cut, so the cut is never seen. The shapes share two standard materials (gold, lacquer; double
   sided), so the hand adds one shader program to compile, not one per material.

   It does not move with the head: the head leans in the palm (AvatarScene rolls about this origin).

   Size: the hand ends 0.29 below the cut at most. On desktop that is just above the status line at
   the bottom of the home screen, on phones just above the cards (see --scene-c in globals.css,
   derived from it). Make it taller and both collide. */

export const HAND = {
  /** The head is cut this far below the chin; the palm covers the cut. Lower shows more neck but the
      cut starts to catch the shoulder slope (flat slivers beside the neck). */
  neckDrop: 0.07,
  /** The axis of the neck at the cut, measured on Avatar.glb */
  axis: { x: -0.055, z: -0.16 },
};

const GOLD = "#c9922e";
const LACQUER = "#070605";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A grid of points (rows by columns) as a smooth surface. The last column wraps to the first when `wrap`. */
function grid(rows: THREE.Vector3[][], wrap = true) {
  const cols = rows[0].length;
  const pos: number[] = [];
  for (const r of rows) for (const p of r) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  const last = wrap ? cols : cols - 1;
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < last; j++) {
      const a = i * cols + j, b = i * cols + ((j + 1) % cols);
      const c = (i + 1) * cols + j, d = (i + 1) * cols + ((j + 1) % cols);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A tube along a smooth curve through `points`, its radius given per point and eased between them, with a
    soft swelling at each inner point (a knuckle). Ends are rounded off. */
function tube(points: THREE.Vector3[], radii: number[], knuckle = 0.07, around = 20, steps = 40, roundStart = false) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const n = points.length - 1;
  const frames = curve.computeFrenetFrames(steps, false);
  const radiusAt = (t: number) => {
    const s = Math.min(n - 1e-9, t * n), i = Math.floor(s), f = smooth(s - i);
    let r = radii[i] + (radii[i + 1] - radii[i]) * f;
    for (let j = 1; j < n; j++) r *= 1 + knuckle * Math.exp(-Math.pow((t * n - j) / 0.22, 2));
    return r;
  };
  const ring = (p: THREE.Vector3, nn: THREE.Vector3, bb: THREE.Vector3, r: number) => {
    const out: THREE.Vector3[] = [];
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2;
      out.push(p.clone().addScaledVector(nn, Math.cos(a) * r).addScaledVector(bb, Math.sin(a) * r));
    }
    return out;
  };
  const rows: THREE.Vector3[][] = [];
  const capRows = (p: THREE.Vector3, tan: THREE.Vector3, nn: THREE.Vector3, bb: THREE.Vector3, r: number, dir: 1 | -1) => {
    const out: THREE.Vector3[][] = [];
    for (let k = 1; k <= 5; k++) {
      const a = (k / 5) * (Math.PI / 2);
      out.push(ring(p.clone().addScaledVector(tan, dir * r * Math.sin(a)), nn, bb, r * Math.cos(a)));
    }
    return out;
  };
  if (roundStart) {
    const t0 = curve.getTangent(0);
    rows.push(...capRows(curve.getPoint(0), t0, frames.normals[0], frames.binormals[0], radiusAt(0), -1).reverse());
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    rows.push(ring(curve.getPoint(t), frames.normals[i], frames.binormals[i], radiusAt(t)));
  }
  rows.push(...capRows(curve.getPoint(1), curve.getTangent(1), frames.normals[steps], frames.binormals[steps], radiusAt(1), 1));
  return grid(rows);
}

/** A box with soft, rounded edges and corners (a superellipsoid): half sizes a, b, c; e1 and e2 below 1 square it up */
function softBox(a: number, b: number, c: number, e1: number, e2: number, bend?: (p: THREE.Vector3) => void) {
  const cols = 56, rowsN = 28;
  const cs = (w: number, e: number) => Math.sign(Math.cos(w)) * Math.pow(Math.abs(Math.cos(w)), e);
  const sn = (w: number, e: number) => Math.sign(Math.sin(w)) * Math.pow(Math.abs(Math.sin(w)), e);
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= rowsN; i++) {
    const v = -Math.PI / 2 + (i / rowsN) * Math.PI;
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < cols; j++) {
      const u = (j / cols) * Math.PI * 2;
      const p = V(a * cs(v, e1) * cs(u, e2), b * sn(v, e1), c * cs(v, e1) * sn(u, e2));
      if (bend) bend(p);
      row.push(p);
    }
    rows.push(row);
  }
  return grid(rows);
}

/** One finger: a chain of three bones that curl up (rotate about z) from a base inside the palm, then turned by `splay` about y. */
function finger(base: THREE.Vector3, splay: number, lens: [number, number, number], flex: [number, number, number], radii: [number, number, number, number, number], inside = 0.1) {
  let u = -inside, y = 0, phi = 0;
  const local: [number, number][] = [[u, y], [0, 0]];
  u = 0;
  for (let i = 0; i < 3; i++) {
    phi += flex[i] * D2R;
    u += lens[i] * Math.cos(phi);
    y += lens[i] * Math.sin(phi);
    local.push([u, y]);
  }
  const cs = Math.cos(splay * D2R), sn = Math.sin(splay * D2R);
  const pts = local.map(([x, yy]) => V(base.x + x * cs, base.y + yy, base.z - x * sn));
  return tube(pts, radii, 0.08, 18, 36);
}

export interface Hand {
  root: THREE.Group;
  /** Every material (they all need the same clipping state as the avatar, see AvatarScene) */
  materials: THREE.Material[];
  /** Nothing moves on its own: kept so the head's loop can treat every prop the same. */
  tick(t: number, calm: boolean): void;
  dispose(): void;
}

/** Where the hand sits relative to the neck, and how it is turned (degrees). The whole look is these numbers. */
export const POSE = {
  /** the palm's centre, relative to the neck origin: the neck sinks into the hollow */
  palm: { x: 0.0, y: -0.012, z: 0.0 },
  /** turn about y: where the fingers point (150 = to the left and away from the camera) */
  yaw: 175,
  /** roll about the finger axis: how far the palm faces the camera */
  roll: 12,
  /** pitch about the palm's width axis: fingers up, wrist down */
  pitch: 10,
  /** the whole hand, larger than life so it can hold a head */
  scale: 1.22,
};

export function createHand(env: THREE.Texture | null, clip: THREE.Plane): Hand {
  const root = new THREE.Group();
  root.name = "hand";
  const own: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const mat = (color: string, metalness: number, roughness: number, envMapIntensity: number) => {
    const m = new THREE.MeshStandardMaterial({
      color, metalness, roughness, envMap: env, envMapIntensity, side: THREE.DoubleSide, clippingPlanes: [clip],
    });
    own.push(m);
    return m;
  };
  const gold = mat(GOLD, 1, 0.28, 1.9);
  const lacquer = mat(LACQUER, 0, 0.16, 0.6);

  const goldParts: THREE.BufferGeometry[] = [];
  const blackParts: THREE.BufferGeometry[] = [];
  const clean = (g: THREE.BufferGeometry) => { g.deleteAttribute("uv"); return g; };

  /* ---- the hand, built flat in its own space: palm in the xz plane facing +y, fingers toward +x, thumb on the -z side ---- */

  // the palm: a soft slab, hollowed a little on top where the neck rests, thinner toward the wrist
  const dish = (p: THREE.Vector3) => {
    const r2 = Math.min(1, (p.x / 0.27) ** 2 + (p.z / 0.27) ** 2);
    if (p.y > 0) p.y -= 0.032 * Math.pow(1 - r2, 2);
    p.y *= 1 - 0.18 * Math.max(0, -p.x / 0.3);
  };
  goldParts.push(clean(softBox(0.3, 0.068, 0.31, 0.62, 0.55, dish)));

  // four fingers, curled up round the neck (index nearest the thumb)
  const F = [
    { z: -0.205, splay: 12, len: [0.235, 0.15, 0.125] as [number, number, number], flex: [24, 40, 26] as [number, number, number], r: 0.057 },
    { z: -0.072, splay: 3,  len: [0.255, 0.165, 0.135] as [number, number, number], flex: [26, 42, 28] as [number, number, number], r: 0.06 },
    { z: 0.066,  splay: -6, len: [0.24, 0.155, 0.128] as [number, number, number], flex: [28, 44, 28] as [number, number, number], r: 0.058 },
    { z: 0.195,  splay: -16, len: [0.19, 0.12, 0.105] as [number, number, number], flex: [30, 44, 28] as [number, number, number], r: 0.05 },
  ];
  for (const f of F) {
    goldParts.push(clean(finger(V(0.245, 0.004, f.z), f.splay, f.len, f.flex, [f.r, f.r * 0.99, f.r * 0.88, f.r * 0.78, f.r * 0.66])));
  }

  // the thumb: from the base of the palm, out to the front and up
  goldParts.push(clean(tube([V(-0.1, -0.02, -0.17), V(0.0, 0.0, -0.31), V(0.1, 0.04, -0.385), V(0.2, 0.1, -0.4), V(0.27, 0.17, -0.38)], [0.085, 0.07, 0.062, 0.056, 0.047], 0.09, 18, 40)));

  // the wrist and forearm: a squashed tube running out of the heel of the palm (flattened to an oval below)
  const squash = new THREE.Matrix4().makeScale(1, 0.64, 1);
  const forearm = tube([V(-0.1, 0, 0), V(-0.25, 0, 0), V(-0.4, 0, 0), V(-0.52, 0, 0)], [0.185, 0.17, 0.165, 0.168], 0, 28, 24);
  forearm.applyMatrix4(squash);
  forearm.translate(0, -0.03, 0);
  goldParts.push(clean(forearm));

  // the cuff: a black lacquer sleeve between two gold bands, closed at the end
  const cuffAxis = (profile: [number, number][], segs = 64) => {
    const g = new THREE.LatheGeometry(profile.map(([r, a]) => new THREE.Vector2(r, a)), segs);
    g.rotateZ(Math.PI / 2); // lathe axis y -> -x
    g.applyMatrix4(squash);
    g.translate(0, -0.03, 0);
    return clean(g);
  };
  blackParts.push(cuffAxis([[0, 0.76], [0.19, 0.76], [0.205, 0.75], [0.21, 0.72], [0.212, 0.68], [0.212, 0.4], [0.21, 0.38], [0.185, 0.38], [0.178, 0.38]]));
  goldParts.push(cuffAxis([[0.181, 0.38], [0.215, 0.38], [0.226, 0.395], [0.229, 0.415], [0.226, 0.435], [0.215, 0.445], [0.181, 0.445]]));
  goldParts.push(cuffAxis([[0.205, 0.76], [0.222, 0.75], [0.228, 0.725], [0.225, 0.7], [0.214, 0.686], [0.203, 0.69]]));

  const addTo = (parts: THREE.BufferGeometry[], material: THREE.Material) => {
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    geometries.push(merged);
    const mesh = new THREE.Mesh(merged, material);
    mesh.frustumCulled = false; // always in view; a wrong bounding sphere would only cost a bug
    return mesh;
  };

  const hand = new THREE.Group();
  hand.add(addTo(goldParts, gold), addTo(blackParts, lacquer));
  hand.position.set(POSE.palm.x, POSE.palm.y, POSE.palm.z);
  hand.scale.setScalar(POSE.scale);
  hand.rotation.order = "YXZ";
  hand.rotation.set(POSE.roll * D2R, POSE.yaw * D2R, POSE.pitch * D2R);
  root.add(hand);

  /* the soft shadow the hand throws on the page: a dark radial gradient on a flat disc */
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(20,14,6,0.45)");
  gr.addColorStop(0.5, "rgba(20,14,6,0.2)");
  gr.addColorStop(1, "rgba(20,14,6,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.push(tex);
  const shade = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, clippingPlanes: [clip] });
  own.push(shade);
  const plane = new THREE.PlaneGeometry(1.5, 1.5);
  plane.rotateX(-Math.PI / 2);
  plane.translate(0.1, -0.3, 0.05);
  geometries.push(plane);
  const shadow = new THREE.Mesh(plane, shade);
  shadow.frustumCulled = false;
  shadow.scale.set(1, 1, 0.5);
  shadow.renderOrder = -1;
  root.add(shadow);

  return {
    root,
    materials: own,
    tick() {},
    dispose() {
      geometries.forEach((g) => g.dispose());
      own.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
