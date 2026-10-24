import * as THREE from "three";

/* The stand the home page head sits on: a black lacquer and gold pedestal, built from code (no
   model to download). From the top down:
     - a gold lip, edged with a row of pearls, that closes round the cut neck (the head is clipped
       just under the chin; see neckDrop),
     - a round black bowl with two tiers of gold lotus petals laid on it, holding the neck,
     - a gold knop, a twisted fluted stem, another knop,
     - a stepped black base with gold inlay rings and a gold rim band,
     - a soft contact shadow on the page underneath.
   Everything is measured in world units and hangs from ONE origin: the middle of the cut neck, at the
   height of the cut. The shapes share three standard materials (gold, lacquer, marble; double sided),
   so the stand adds one shader program to compile, not one per material.

   It does not move with the head: the head leans on its collar (AvatarScene rolls about this origin),
   and only the stem turns, very slowly, so the fluting seems to climb.

   Size: the base ends 0.29 below the cut. On desktop that is just above the status line at the bottom
   of the home screen, on phones just above the cards (see --scene-c in globals.css, derived from it).
   Make it taller and both collide. */

export const STAND = {
  /** The head is cut this far below the chin; the lip covers the cut. Lower shows more neck but the
      cut starts to catch the shoulder slope (flat slivers beside the neck). */
  neckDrop: 0.07,
  /** The collar is this much shallower than it is wide (the neck is wider than it is deep) */
  collarDepth: 0.72,
  /** The collar axis: the middle of the neck at the cut, measured on Avatar.glb */
  axis: { x: -0.055, z: -0.16 },
};

const GOLD = "#c9922e";
const LACQUER = "#070605";
const MARBLE = "#1b1815";

const P = (r: number, y: number) => new THREE.Vector2(r, y);

/** A solid of revolution from a profile listed bottom to top, so its faces point outward */
function lathe(points: [number, number][], segments = 96) {
  return new THREE.LatheGeometry(points.map(([r, y]) => P(r, y)), segments);
}

/** A flat ring lying on a surface (an inlay) */
function inlay(radius: number, tube: number, y: number) {
  const g = new THREE.TorusGeometry(radius, tube, 8, 128);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

function torusAt(radius: number, tube: number, y: number) {
  const g = new THREE.TorusGeometry(radius, tube, 14, 96);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/* The twisted, fluted stem. A grid of points (rows down, columns around) whose radius swells in the
   middle and is carved by grooves that spiral with the height. The seam is shared (the last column
   wraps to the first), so the lighting has no line in it. */
function flutedStem(top: number, bottom: number, radius: number, flutes: number, twist: number) {
  const cols = 96, rows = 28;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let iy = 0; iy <= rows; iy++) {
    const t = iy / rows;
    const y = top + (bottom - top) * t;
    const swell = 1 + 0.2 * Math.sin(Math.PI * t) - 0.05 * Math.cos(Math.PI * 2 * t);
    for (let ix = 0; ix < cols; ix++) {
      const a = (ix / cols) * Math.PI * 2;
      const groove = 0.5 - 0.5 * Math.cos(flutes * (a + twist * t));
      const r = radius * swell * (1 - 0.13 * Math.pow(groove, 1.6));
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iy * cols + ix, b = iy * cols + ((ix + 1) % cols);
      const c = (iy + 1) * cols + ix, d = (iy + 1) * cols + ((ix + 1) % cols);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* A lotus petal lying on a curved surface of revolution (the bowl), standing off it by `offset`. `from` and
   `to` are how far up the curve (0 bottom, 1 top) it starts and ends; it is widest part-way and has a raised
   middle rib. Built in the +x direction, then turned round the y axis by ring(). */
function petalOn(curve: THREE.SplineCurve, from: number, to: number, halfWidth: number, lift: number, offset: number) {
  const rows = 18, cols = 8;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const s = from + (to - from) * u;
    const p = curve.getPointAt(s);
    const t = curve.getTangentAt(s);
    // outward normal of the lathe surface (profile listed bottom to top): (dy, -dr)
    const nx = t.y, ny = -t.x;
    const r = p.x + nx * offset, y = p.y + ny * offset;
    const w = halfWidth * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85);
    for (let j = 0; j <= cols; j++) {
      const v = (j / cols) * 2 - 1;
      const rib = lift * (1 - v * v) * Math.sin(Math.PI * Math.min(1, u * 1.1));
      const z = v * w;
      const rr = r + nx * rib - (z * z) / (2 * Math.max(r, 0.1));
      pos.push(rr, y + ny * rib, z);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + 1, c = a + (cols + 1), d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** n copies of a geometry turned around the y axis, joined into one (one draw call) */
function ring(g: THREE.BufferGeometry, n: number, phase = 0) {
  const src = g.getAttribute("position") as THREE.BufferAttribute;
  const nrm = g.getAttribute("normal") as THREE.BufferAttribute;
  const ix = g.index!;
  const pos = new Float32Array(src.count * n * 3);
  const nor = new Float32Array(src.count * n * 3);
  const idx = new Uint32Array(ix.count * n);
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    m.makeRotationY(phase + (k / n) * Math.PI * 2);
    for (let i = 0; i < src.count; i++) {
      v.fromBufferAttribute(src, i).applyMatrix4(m);
      pos.set([v.x, v.y, v.z], (k * src.count + i) * 3);
      v.fromBufferAttribute(nrm, i).transformDirection(m);
      nor.set([v.x, v.y, v.z], (k * src.count + i) * 3);
    }
    for (let i = 0; i < ix.count; i++) idx[k * ix.count + i] = ix.getX(i) + k * src.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** The soft shadow the base throws on the page: a dark radial gradient on a flat disc */
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(20,14,6,0.55)");
  g.addColorStop(0.45, "rgba(20,14,6,0.28)");
  g.addColorStop(1, "rgba(20,14,6,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface Stand {
  root: THREE.Group;
  /** Every material (they all need the same clipping state as the avatar, see AvatarScene) */
  materials: THREE.Material[];
  /** Moves the one slow part. Not called (or called with calm) when motion is reduced. */
  tick(t: number, calm: boolean): void;
  dispose(): void;
}

export function createStand(env: THREE.Texture | null, clip: THREE.Plane): Stand {
  const root = new THREE.Group();
  root.name = "stand";
  const geometries: THREE.BufferGeometry[] = [];
  const own: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const mat = (color: string, metalness: number, roughness: number, envMapIntensity: number) => {
    const m = new THREE.MeshStandardMaterial({
      color, metalness, roughness, envMap: env, envMapIntensity, side: THREE.DoubleSide, clippingPlanes: [clip],
    });
    own.push(m);
    return m;
  };
  const gold = mat(GOLD, 1, 0.3, 1.9);
  const lacquer = mat(LACQUER, 0, 0.16, 0.6);
  const marble = mat(MARBLE, 0.1, 0.22, 0.8);

  const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = root) => {
    geometries.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false; // the stand is always in view, and a wrong bounding sphere would only cost a bug
    parent.add(mesh);
    return mesh;
  };

  /* The collar follows the neck, which is wider than it is deep: a round collar would stick out in front
     as a flat dish. Everything in it is drawn round and then squeezed in z (the stem and base stay round). */
  const collar = new THREE.Group();
  collar.scale.z = STAND.collarDepth;
  root.add(collar);

  /* the lip: a gold ring the neck passes through, on the plane where the head is cut, edged with a tube
     and a row of pearls */
  add(lathe([[0.47, -0.022], [0.49, -0.01], [0.52, 0.004], [0.55, 0.014], [0.54, 0.03], [0.515, 0.036], [0.49, 0.028], [0.47, 0.012]]), gold, collar);
  add(torusAt(0.548, 0.016, 0.018), gold, collar);
  const pearl = new THREE.SphereGeometry(0.0125, 12, 10);
  pearl.translate(0.49, 0.04, 0);
  add(ring(pearl, 64), gold, collar);
  /* the black socket inside the lip, so a glance into the gap is dark, not see-through */
  add(lathe([[0.2, -0.06], [0.47, -0.022], [0.47, 0.012], [0.46, 0.012]]), lacquer, collar);

  /* the bowl the neck rests in: a rounded black cup, with two tiers of gold lotus petals laid on it */
  const bowl = new THREE.SplineCurve([P(0.09, -0.135), P(0.14, -0.13), P(0.22, -0.118), P(0.3, -0.1), P(0.37, -0.077), P(0.425, -0.05), P(0.455, -0.026), P(0.47, -0.006)]);
  add(new THREE.LatheGeometry(bowl.getPoints(28), 96), lacquer, collar);
  add(ring(petalOn(bowl, 0.04, 1, 0.062, 0.014, 0.012), 20), gold, collar);
  add(ring(petalOn(bowl, 0.04, 0.62, 0.05, 0.012, 0.022), 20, Math.PI / 20), gold, collar);

  /* the knop under the bowl, the stem and the knop above the base */
  add(torusAt(0.095, 0.017, -0.14), gold);
  const rotor = new THREE.Group();
  root.add(rotor);
  add(flutedStem(-0.145, -0.196, 0.078, 7, 2.2), marble, rotor);
  add(torusAt(0.11, 0.015, -0.198), gold);

  /* the base: an upper step with gold inlays, then the wide plinth with its gold rim band */
  add(lathe([[0, -0.236], [0.35, -0.236], [0.362, -0.23], [0.362, -0.218], [0.35, -0.209], [0.3, -0.206], [0.22, -0.203], [0.16, -0.199], [0.148, -0.194], [0, -0.194]]), lacquer);
  add(inlay(0.275, 0.005, -0.2065), gold);
  add(inlay(0.2, 0.0035, -0.2035), gold);
  add(lathe([[0, -0.282], [0.45, -0.282], [0.472, -0.274], [0.477, -0.262], [0.477, -0.25], [0.468, -0.241], [0.43, -0.238], [0, -0.238]]), lacquer);
  add(inlay(0.43, 0.006, -0.2385), gold);
  add(lathe([[0.465, -0.276], [0.482, -0.269], [0.486, -0.259], [0.486, -0.249], [0.48, -0.243], [0.466, -0.24]]), gold);
  add(lathe([[0.47, -0.292], [0.51, -0.292], [0.52, -0.286], [0.516, -0.279], [0.47, -0.276]]), gold);

  /* the contact shadow */
  const tex = shadowTexture();
  textures.push(tex);
  const shade = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, clippingPlanes: [clip] });
  own.push(shade);
  const plane = new THREE.PlaneGeometry(1.5, 1.5);
  plane.rotateX(-Math.PI / 2);
  plane.translate(0, -0.29, 0.02);
  const shadow = add(plane, shade);
  shadow.scale.set(1, 1, 0.55);
  shadow.renderOrder = -1;

  return {
    root,
    materials: own,
    tick(t, calm) {
      rotor.rotation.y = calm ? 0 : t * 0.12;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      own.forEach((m) => m.dispose());
      textures.forEach((x) => x.dispose());
    },
  };
}
