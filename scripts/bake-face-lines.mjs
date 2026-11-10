/* Bakes the ink sketch of the avatar's head from its own render (public/face-still.webp, the picture the site shows when
   WebGL is unavailable, which sits exactly where the 3D head sits at rest). Nothing here is a generic face: every line is
   found in the real picture.

     - silhouette: the outline of the alpha mask (cap, head, ears), cut off at the neck
     - lines: Canny edges (cap seams, the "TA." logo, brows, eyes, nose, mouth, ears, jaw), traced into strokes
     - hatching: zig-zag pen strokes laid where the picture is dark (beard, cap crown), in two densities
     - brim: the black cap band as one ink-filled shape

   Output: components/homebuild/faceLines.ts (committed). Run:  node scripts/bake-face-lines.mjs [preview.png]
   The preview draws every group in its own colour over the picture so it can be checked by eye. */

import sharp from "sharp";
import fs from "node:fs";

const SRC = "public/face-still.webp";
const OUT = "components/homebuild/faceLines.ts";
const PREVIEW = process.argv[2];

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const A = new Float32Array(N), L = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const a = data[i * 4 + 3] / 255;
  A[i] = a;
  L[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) * a + 255 * (1 - a);
}
const NECK_Y = 690; // nothing below this is drawn: the 3D head fades out here too
const SIL_CUT = 668; // the outline stops here (no hooks at the neck)

// seeded random so the bake is repeatable
let seed = 20261110;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- small image helpers ---------- */
function blur(src, sigma) {
  const r = Math.ceil(sigma * 3), k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const tmp = new Float32Array(N), out = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let i = -r; i <= r; i++) v += src[y * W + Math.min(W - 1, Math.max(0, x + i))] * k[i + r];
    tmp[y * W + x] = v;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let i = -r; i <= r; i++) v += tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x] * k[i + r];
    out[y * W + x] = v;
  }
  return out;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const plen = (p) => { let s = 0; for (let i = 2; i < p.length; i += 2) s += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return s; };
const toPts = (flat) => { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; };
const flat = (pts) => pts.flatMap((q) => [q[0], q[1]]);

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let dmax = 0, idx = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], d2 = dx * dx + dy * dy;
  for (let i = 1; i < pts.length - 1; i++) {
    const t = d2 ? Math.max(0, Math.min(1, ((pts[i][0] - a[0]) * dx + (pts[i][1] - a[1]) * dy) / d2)) : 0;
    const d = Math.hypot(pts[i][0] - (a[0] + t * dx), pts[i][1] - (a[1] + t * dy));
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
  return [a, b];
}
function chaikin(pts, rounds = 1) {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    if (p.length < 3) return p;
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      q.push([0.75 * p[i][0] + 0.25 * p[i + 1][0], 0.75 * p[i][1] + 0.25 * p[i + 1][1]]);
      q.push([0.25 * p[i][0] + 0.75 * p[i + 1][0], 0.25 * p[i][1] + 0.75 * p[i + 1][1]]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

/* ---------- 1. where is the head (alpha mask, eroded so lines never double the outline) ---------- */
const headMask = new Uint8Array(N);
for (let i = 0; i < N; i++) headMask[i] = A[i] > 0.5 && ((i / W) | 0) <= NECK_Y + 2 ? 1 : 0;
function erode(mask, r) {
  const tmp = new Uint8Array(N), out = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let ok = 1;
    for (let i = -r; i <= r && ok; i++) { const xx = x + i; if (xx < 0 || xx >= W || !mask[y * W + xx]) ok = 0; }
    tmp[y * W + x] = ok;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let ok = 1;
    for (let i = -r; i <= r && ok; i++) { const yy = y + i; if (yy < 0 || yy >= H || !tmp[yy * W + x]) ok = 0; }
    out[y * W + x] = ok;
  }
  return out;
}
const inner = erode(headMask, 7);

/* ---------- 2. silhouette, traced round the alpha mask ---------- */
const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
const dirOf = (dx, dy) => { for (let d = 0; d < 8; d++) if (DX[d] === dx && DY[d] === dy) return d; return 0; };
function traceOuter(m, sx, sy) {
  const get = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  const pts = [];
  let cx = sx, cy = sy, bdir = 4, guard = 0;
  do {
    pts.push([cx, cy]);
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (bdir + k) % 8, nx = cx + DX[d], ny = cy + DY[d];
      if (get(nx, ny)) {
        const pd = (d + 7) % 8;
        const bx = cx + DX[pd] - nx, by = cy + DY[pd] - ny;
        bdir = dirOf(Math.sign(bx), Math.sign(by));
        cx = nx; cy = ny; moved = true;
        break;
      }
    }
    if (!moved) break;
  } while (!(cx === sx && cy === sy && pts.length > 3) && ++guard < 200000);
  return pts;
}
function firstPixel(m, y0 = 0, y1 = H) { for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) return [x, y]; return null; }

const sp = firstPixel(headMask);
let sil = rdp(traceOuter(headMask, sp[0], sp[1]), 1.1);
// open the closed loop at the neck: drop everything at the bottom, then split at the top into a left and a right pen stroke
{
  const keep = sil.map((q) => q[1] < SIL_CUT);
  let start = keep.findIndex((k, i) => k && !keep[(i + sil.length - 1) % sil.length]);
  if (start < 0) start = 0;
  const rot = [...sil.slice(start), ...sil.slice(0, start)];
  const open = [];
  for (const q of rot) { if (q[1] < SIL_CUT) open.push(q); else if (open.length > 8) break; }
  let top = 0;
  open.forEach((q, i) => { if (q[1] < open[top][1]) top = i; });
  const a = open.slice(0, top + 1), b = open.slice(top).reverse();
  sil = [a, b].map((s) => chaikin(rdp(s, 1.0), 1)).sort((s, t) => s[0][0] - t[0][0]);
}

/* ---------- 3. Canny edges, in separate passes so the subtle face lines are not drowned out by the strong cap lines ---------- */
function gradientMaps(sigma) {
  const G = blur(L, sigma);
  const MAG = new Float32Array(N), ANG = new Uint8Array(N), NMS = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const gx = -G[i - W - 1] - 2 * G[i - 1] - G[i + W - 1] + G[i - W + 1] + 2 * G[i + 1] + G[i + W + 1];
    const gy = -G[i - W - 1] - 2 * G[i - W] - G[i - W + 1] + G[i + W - 1] + 2 * G[i + W] + G[i + W + 1];
    MAG[i] = Math.hypot(gx, gy);
    let a = (Math.atan2(gy, gx) * 180) / Math.PI; if (a < 0) a += 180;
    ANG[i] = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, m = MAG[i];
    const [n1, n2] = ANG[i] === 0 ? [MAG[i - 1], MAG[i + 1]] : ANG[i] === 1 ? [MAG[i - W + 1], MAG[i + W - 1]] : ANG[i] === 2 ? [MAG[i - W], MAG[i + W]] : [MAG[i - W - 1], MAG[i + W + 1]];
    if (m >= n1 && m >= n2) NMS[i] = m;
  }
  return NMS;
}
const regionMask = (x0, y0, x1, y1) => { const m = new Uint8Array(N); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (inner[y * W + x]) m[y * W + x] = 1; return m; };
const nbrs8 = (edge, i) => { const x = i % W, y = (i / W) | 0, o = []; for (let d = 0; d < 8; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < W && ny < H && edge[ny * W + nx]) o.push(ny * W + nx); } return o; };
/** edges inside a region: the strongest `pct` share of pixels seed the lines, the weaker ones are kept if they join a strong one */
function edgesIn(NMS, region, pct, lowRatio, minLen) {
  const vals = [];
  for (let i = 0; i < N; i++) if (NMS[i] > 0 && region[i]) vals.push(NMS[i]);
  vals.sort((a, b) => a - b);
  const high = vals[Math.floor(vals.length * pct)], low = high * lowRatio;
  const edge = new Uint8Array(N), stack = [];
  for (let i = 0; i < N; i++) if (region[i] && NMS[i] >= high) { edge[i] = 1; stack.push(i); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
      const j = ny * W + nx;
      if (!edge[j] && region[j] && NMS[j] >= low) { edge[j] = 1; stack.push(j); }
    }
  }
  // link pixels into strokes, going straight through junctions
  const seen = new Uint8Array(N), raw = [];
  const walk = (s) => {
    const path = [s]; seen[s] = 1;
    let cur = s, last = null;
    for (;;) {
      const cand = nbrs8(edge, cur).filter((j) => !seen[j]);
      if (!cand.length) break;
      let best = cand[0];
      if (last !== null && cand.length > 1) {
        const vx = (cur % W) - (last % W), vy = ((cur / W) | 0) - ((last / W) | 0);
        let bs = -9;
        for (const j of cand) { const ux = (j % W) - (cur % W), uy = ((j / W) | 0) - ((cur / W) | 0); const sc = (ux * vx + uy * vy) / Math.hypot(ux, uy); if (sc > bs) { bs = sc; best = j; } }
      }
      seen[best] = 1; path.push(best); last = cur; cur = best;
    }
    return path;
  };
  for (let i = 0; i < N; i++) if (edge[i] && !seen[i] && nbrs8(edge, i).length <= 1) raw.push(walk(i));
  for (let i = 0; i < N; i++) if (edge[i] && !seen[i]) raw.push(walk(i));
  const out = [];
  for (const p of raw) {
    if (p.length < 10) continue;
    const pts = chaikin(rdp(p.map((i) => [i % W, (i / W) | 0]), 1.5), 1);
    if (plen(flat(pts)) >= minLen) out.push(pts);
  }
  return out;
}
const N15 = gradientMaps(1.5), N22 = gradientMaps(2.3);
const capLines = edgesIn(N15, regionMask(0, 0, W, 288), 0.935, 0.42, 34);                 // seams, logo, brim edges
const brimLower = edgesIn(N22, regionMask(0, 225, W, 345), 0.965, 0.5, 90);               // the long curve under the brim
const N11 = gradientMaps(1.1);
/** the iris: the darkest soft blob in a window, drawn as two concentric rings */
const Lsoft = blur(L, 4.2), Lc = blur(L, 1.6);
function irisRings([x0, y0, x1, y1]) {
  let best = 1e9, cx = 0, cy = 0;
  for (let y = y0 + 12; y < y1 - 12; y++) for (let x = x0 + 14; x < x1 - 14; x++) { const v = Lsoft[y * W + x]; if (v < best) { best = v; cx = x; cy = y; } }
  // settle on the centre of the dark mass around that spot (mean shift), so the ring sits on the iris and not on a lash or shadow
  for (let it = 0; it < 4; it++) {
    let sx = 0, sy = 0, sw = 0;
    for (let y = Math.max(y0, Math.round(cy) - 16); y < Math.min(y1, Math.round(cy) + 17); y++) for (let x = Math.max(x0, Math.round(cx) - 16); x < Math.min(x1, Math.round(cx) + 17); x++) {
      if (Math.hypot(x - cx, y - cy) > 16) continue;
      const w = Math.max(0, 125 - Lc[y * W + x]);
      sx += x * w; sy += y * w; sw += w;
    }
    if (sw > 0) { cx = sx / sw; cy = sy / sw; }
  }
  const r = 12;
  const ring = (rr, wob) => Array.from({ length: 29 }, (_, k) => { const t = (k / 28) * Math.PI * 2 + 0.4; return [cx + Math.cos(t) * rr * (1 + (rnd() - 0.5) * wob), cy + Math.sin(t) * rr * (1 + (rnd() - 0.5) * wob)]; });
  return [ring(r, 0.05), ring(r * 0.46, 0.08)];
}
const leftEye = [262, 318, 408, 374], rightEye = [432, 322, 556, 380];
const faceLines = [
  ...edgesIn(N22, regionMask(225, 285, 585, 322), 0.90, 0.40, 24),                        // brows
  ...edgesIn(N11, regionMask(...leftEye), 0.72, 0.40, 14),                                 // left eyelids and eye corners
  ...edgesIn(N11, regionMask(...rightEye), 0.72, 0.40, 14),                                // right eyelids and eye corners
  ...irisRings(leftEye), ...irisRings(rightEye),
  ...edgesIn(N15, regionMask(335, 380, 495, 492), 0.78, 0.40, 16),                        // nose: bridge, sides, nostrils
  ...edgesIn(N22, regionMask(300, 500, 500, 590), 0.88, 0.40, 18),                        // moustache and mouth
  ...edgesIn(N15, regionMask(176, 330, 244, 565), 0.84, 0.40, 18),                        // left ear
  ...edgesIn(N15, regionMask(566, 330, 640, 565), 0.84, 0.40, 18),                        // right ear
];
const dedupe = (lists) => { // drop a stroke if most of it lies on a longer one already kept
  const kept = [];
  for (const s of lists.sort((a, b) => plen(flat(b)) - plen(flat(a)))) {
    const near = (q) => kept.some((k) => k.some((r) => Math.abs(r[0] - q[0]) < 5 && Math.abs(r[1] - q[1]) < 5));
    if (s.filter(near).length / s.length < 0.5) kept.push(s);
  }
  return kept;
};
const cap = dedupe([...capLines, ...brimLower]);
const feat = dedupe(faceLines);
// pen order: bands from the top, nearest next stroke inside a band (a stroke may be drawn backwards)
function order(strokes, band = 55) {
  const out = [], rest = strokes.map((s) => ({ s, cy: s.reduce((a, q) => a + q[1], 0) / s.length })).sort((a, b) => a.cy - b.cy);
  let pen = [W / 2, 0];
  while (rest.length) {
    const bandTop = rest[0].cy;
    const inBand = rest.filter((r) => r.cy < bandTop + band);
    let bestI = -1, bestD = 1e9, flip = false;
    for (const r of inBand) {
      const d0 = dist(pen, r.s[0]), d1 = dist(pen, r.s[r.s.length - 1]);
      if (d0 < bestD) { bestD = d0; bestI = rest.indexOf(r); flip = false; }
      if (d1 < bestD) { bestD = d1; bestI = rest.indexOf(r); flip = true; }
    }
    const pick = rest.splice(bestI, 1)[0].s;
    const s = flip ? [...pick].reverse() : pick;
    out.push(s); pen = s[s.length - 1];
  }
  return out;
}

/* ---------- 4. hatching where the picture is dark ---------- */
const Lb = blur(L, 2.2);
function maskOf(fn) { const m = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; m[i] = inner[i] && fn(x, y, i) ? 1 : 0; } return m; }
function hatch(mask, angleDeg, spacing) {
  const th = (angleDeg * Math.PI) / 180, d = [Math.cos(th), Math.sin(th)], n = [-Math.sin(th), Math.cos(th)];
  const diag = Math.hypot(W, H), cx = W / 2, cy = H / 2;
  const strokes = [];
  let cur = null, lineNo = 0;
  for (let s = -diag / 2; s <= diag / 2; s += spacing) {
    const runs = [];
    let run = null;
    for (let t = -diag / 2; t <= diag / 2; t += 1) {
      const x = Math.round(cx + s * n[0] + t * d[0]), y = Math.round(cy + s * n[1] + t * d[1]);
      const on = x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
      if (on) { if (!run) run = [t, t]; else run[1] = t; } else if (run) { if (run[1] - run[0] >= 10) runs.push(run); run = null; }
    }
    if (run && run[1] - run[0] >= 10) runs.push(run);
    const flip = lineNo++ % 2 === 1;
    for (const r of flip ? [...runs].reverse() : runs) {
      const jx = (rnd() - 0.5) * 1.6;
      const pts = [];
      const steps = Math.max(1, Math.round((r[1] - r[0]) / 16));
      for (let k = 0; k <= steps; k++) {
        const t = r[0] + ((r[1] - r[0]) * k) / steps;
        pts.push([cx + (s + jx + (k && k < steps ? (rnd() - 0.5) * 1.4 : 0)) * n[0] + t * d[0], cy + (s + jx + (k && k < steps ? (rnd() - 0.5) * 1.4 : 0)) * n[1] + t * d[1]]);
      }
      if (flip) pts.reverse();
      if (cur && dist(cur[cur.length - 1], pts[0]) < spacing * 2.4) cur.push(...pts);
      else { if (cur) strokes.push(cur); cur = [...pts]; }
    }
  }
  if (cur) strokes.push(cur);
  return strokes.filter((s) => plen(flat(s)) > 20).map((s) => s.map((q) => [Math.round(q[0] * 2) / 2, Math.round(q[1] * 2) / 2]));
}
// beard: dark, brown, below the nose and not the lips
const beard = maskOf((x, y, i) => y > 470 && y < NECK_Y - 4 && Lb[i] < 118 && !(x > 330 && x < 470 && y > 505 && y < 560 && Lb[i] > 85));
const beardDense = maskOf((x, y, i) => y > 520 && y < NECK_Y - 4 && Lb[i] < 58);
const crown = maskOf((x, y, i) => y < 250 && Lb[i] > 52 && Lb[i] < 135 && !(x > 335 && x < 470 && y > 70 && y < 165));
const hatchBeard = [...hatch(beard, -62, 8), ...hatch(beardDense, 24, 15)];
const hatchBeardLite = hatch(beard, -62, 17);
const hatchCrown = hatch(crown, 42, 12);
const hatchCrownLite = hatch(crown, 42, 22);

/* ---------- 5. the black brim, as one ink-filled shape ---------- */
const brimMask = new Uint8Array(N);
{
  const Lbrim = blur(L, 1.2);
  for (let y = 150; y < 362; y++) for (let x = 0; x < W; x++) { const i = y * W + x; brimMask[i] = headMask[i] && Lbrim[i] < 46 ? 1 : 0; }
}
const bp = firstPixel(brimMask, 150, 362);
const brim = chaikin(rdp(traceOuter(brimMask, bp[0], bp[1]), 1.3), 1).map((q) => [Math.round(q[0] * 2) / 2, Math.round(q[1] * 2) / 2]);

/* ---------- 6. write it out ---------- */
const r1 = (v) => Math.round(v * 2) / 2;
const mk = (g, pts) => ({ g, p: flat(pts).map(r1), len: Math.round(plen(flat(pts))) });
const strokes = [
  ...sil.map((s) => mk("sil", s)),
  ...order(cap).map((s) => mk("cap", s)),
  ...order(feat).map((s) => mk("feat", s)),
  ...hatchCrown.map((s) => mk("crown", s)),
  ...hatchCrownLite.map((s) => mk("crownLite", s)),
  ...hatchBeard.map((s) => mk("beard", s)),
  ...hatchBeardLite.map((s) => mk("beardLite", s)),
];
const ts = `/* GENERATED by scripts/bake-face-lines.mjs from public/face-still.webp (the avatar's own render). Do not edit by hand:
   change the picture or the script and run it again. Coordinates are in that picture's pixels (${W} x ${H}). */

export type FaceStroke = { g: "sil" | "cap" | "feat" | "crown" | "crownLite" | "beard" | "beardLite"; p: number[]; len: number };

export const FACE_W = ${W};
export const FACE_H = ${H};
/** Drawn in this order inside each group. sil = outline, cap = cap seams and logo, feat = brows, eyes, nose, mouth, ears, jaw, crown/beard = hatching (Lite = sparser, for phones) */
export const FACE_STROKES: FaceStroke[] = ${JSON.stringify(strokes)};
/** The black cap band, filled with ink */
export const FACE_BRIM: number[] = ${JSON.stringify(flat(brim))};
`;
fs.writeFileSync(OUT, ts);
const count = (g) => strokes.filter((s) => s.g === g).length;
const total = (g) => strokes.filter((s) => s.g === g).reduce((a, s) => a + s.len, 0);
console.log(`wrote ${OUT} (${(ts.length / 1024).toFixed(1)} KB)`);
for (const g of ["sil", "cap", "feat", "crown", "crownLite", "beard", "beardLite"]) console.log(g.padEnd(10), String(count(g)).padStart(4), "strokes", String(Math.round(total(g))).padStart(6), "px");
console.log("brim polygon points", brim.length);

if (PREVIEW) {
  const png = await sharp(SRC).flatten({ background: "#ffffff" }).png().toBuffer();
  const col = { sil: "#000", cap: "#1a56ff", feat: "#e0261b", crown: "#8a8a8a", beard: "#8a8a8a" };
  const paths = strokes.filter((s) => !s.g.endsWith("Lite")).map((s) => `<path d="M${s.p.map((v, i) => (i % 2 ? " " : (i ? " L" : "")) + v).join("")}" fill="none" stroke="${col[s.g]}" stroke-width="${s.g === "sil" ? 2.4 : 1.5}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 1.5}" height="${H * 1.5}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f1ede2"/><image href="data:image/png;base64,${png.toString("base64")}" width="${W}" height="${H}" opacity="0.22"/><path d="M${brim.map((q) => q.join(" ")).join(" L")} Z" fill="#000" opacity="0.5"/>${paths}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(PREVIEW);
  console.log("preview", PREVIEW);
}
