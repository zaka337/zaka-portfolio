import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* Building blocks for the world and the cars. Hundreds of small parts are collected here by
   material and merged into a handful of meshes, so a whole military base is a few draw calls
   instead of a few hundred. */

export const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 10),
  sphere: new THREE.SphereGeometry(1, 18, 14),
  sphereLow: new THREE.SphereGeometry(1, 10, 8),
  prism: (() => {
    // a triangular prism (a roof): base 1 wide, 1 high, 1 long, running along z
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    return g;
  })(),
  halfCyl: new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, 0, Math.PI),
};

export class Merger {
  private groups = new Map<string, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();

  add(geo: THREE.BufferGeometry, key: string, x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
    this.e.set(rx, ry, rz, "YXZ");
    this.q.setFromEuler(this.e);
    this.p.set(x, y, z);
    this.s.set(sx, sy, sz);
    this.m.compose(this.p, this.q, this.s);
    const c = geo.index ? geo.toNonIndexed() : geo.clone();
    c.applyMatrix4(this.m);
    for (const k of Object.keys(c.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") c.deleteAttribute(k);
    const list = this.groups.get(key);
    if (list) list.push(c); else this.groups.set(key, [c]);
  }
  box(key: string, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, rx = 0, rz = 0) {
    this.add(UNIT.box, key, x, y, z, ry, w, h, d, rx, rz);
  }
  cyl(key: string, x: number, y: number, z: number, r: number, h: number, ry = 0, rx = 0, rz = 0, sx = 1, sz = 1) {
    this.add(UNIT.cyl, key, x, y, z, ry, r * sx, h, r * sz, rx, rz);
  }
  sphere(key: string, x: number, y: number, z: number, rx_: number, ry_ = rx_, rz_ = rx_) {
    this.add(UNIT.sphere, key, x, y, z, 0, rx_, ry_, rz_);
  }
  rbox(key: string, x: number, y: number, z: number, w: number, h: number, d: number, r = 0.15, ry = 0, rx = 0, rz = 0) {
    const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    this.add(g, key, x, y, z, ry, 1, 1, 1, rx, rz);
    g.dispose();
  }
  /** Merge everything collected into one mesh per material and add them to `parent` */
  build(mats: Record<string, THREE.Material>, parent: THREE.Object3D, cast = true, receive = true) {
    const out: THREE.Mesh[] = [];
    for (const [key, list] of this.groups) {
      const mat = mats[key];
      if (!mat) throw new Error(`no material for "${key}"`);
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      out.push(mesh);
    }
    this.groups.clear();
    return out;
  }
}

export const lambert = (color: number, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
export const basic = (color: number, extra: Partial<THREE.MeshBasicMaterialParameters> = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

export function roadTexture() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = "#3c3f45"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 50 + Math.random() * 40;
      c.fillStyle = `rgba(${v},${v},${v + 4},0.35)`;
      c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // darker rubber line down each lane
    c.fillStyle = "rgba(20,20,24,0.22)";
    c.fillRect(w * 0.22, 0, w * 0.09, h); c.fillRect(w * 0.69, 0, w * 0.09, h);
    // edge lines
    c.fillStyle = "#e9e6dc";
    c.fillRect(w * 0.035, 0, w * 0.018, h); c.fillRect(w * 0.947, 0, w * 0.018, h);
    // dashed centre line
    c.fillStyle = "#f1c232";
    c.fillRect(w * 0.492, 0, w * 0.016, h * 0.36);
    c.fillRect(w * 0.492, h * 0.5, w * 0.016, h * 0.36);
  }, true);
}

export function stripeTexture(a: string, b: string) {
  return canvasTexture(8, 64, (c, w, h) => {
    c.fillStyle = a; c.fillRect(0, 0, w, h / 2);
    c.fillStyle = b; c.fillRect(0, h / 2, w, h / 2);
  }, true);
}

export function checkerTexture(cols: number, rows: number, size = 32) {
  return canvasTexture(cols * size, rows * size, (c) => {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      c.fillStyle = (x + y) % 2 ? "#fafafa" : "#101010";
      c.fillRect(x * size, y * size, size, size);
    }
  });
}

export function signTexture(text: string, bg: string, fg: string, w = 512, h = 128, font = "900 64px Helvetica, Arial, sans-serif") {
  return canvasTexture(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = fg;
    c.fillRect(0, 0, w, 8); c.fillRect(0, h - 8, w, 8);
    c.font = font; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(text, w / 2, h / 2 + 4);
  });
}

export function chevronTexture() {
  return canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = "#16181c"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#ffd23f"; c.lineWidth = 16; c.lineCap = "round"; c.lineJoin = "round";
    for (const dx of [-22, 22]) {
      c.beginPath(); c.moveTo(w / 2 + dx - 18, h * 0.22); c.lineTo(w / 2 + dx + 18, h / 2); c.lineTo(w / 2 + dx - 18, h * 0.78); c.stroke();
    }
  });
}

export function crowdTexture() {
  return canvasTexture(256, 64, (c, w, h) => {
    c.fillStyle = "#2c2f36"; c.fillRect(0, 0, w, h);
    const cols = ["#ff5a1f", "#ffd23f", "#3aa0ff", "#f4f4f0", "#37c779", "#e04a8f", "#8a5cff"];
    for (let i = 0; i < 520; i++) {
      c.fillStyle = cols[(Math.random() * cols.length) | 0];
      const x = Math.random() * w, y = Math.random() * h;
      c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill();
      c.fillStyle = "#f3c9a0"; c.beginPath(); c.arc(x, y - 3.4, 1.5, 0, 7); c.fill();
    }
  }, true);
}

export function softDot() {
  return canvasTexture(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}

export function waterTexture() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.5;
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = i % 3 ? "#cfe9f7" : "#9fd0ec";
      c.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * w, y = Math.random() * h, l = 14 + Math.random() * 34;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 5, x + l, y); c.stroke();
    }
  }, true);
}

export function helipadTexture() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = "#4d5158"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#f1c232"; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2, w * 0.43, 0, 7); c.stroke();
    c.fillStyle = "#f4f1e6"; c.font = "900 150px Helvetica, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("H", w / 2, h / 2 + 8);
  });
}

/** Free every geometry, material and texture under an object */
export function disposeTree(root: THREE.Object3D) {
  const seen = new Set<unknown>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !seen.has(m.geometry)) { seen.add(m.geometry); m.geometry.dispose(); }
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      if (seen.has(mat)) continue;
      seen.add(mat);
      for (const v of Object.values(mat as unknown as Record<string, unknown>)) if (v instanceof THREE.Texture && !seen.has(v)) { seen.add(v); v.dispose(); }
      mat.dispose();
    }
  });
}
