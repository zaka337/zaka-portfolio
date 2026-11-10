/* From a face to an ink portrait: the strokes the five cursors draw in components/portrait.

   Input: the face tracker's landmarks (MediaPipe Face Landmarker, 478 points) and the picture they came from. Output: a list of
   pen strokes in a fixed 800 x 1000 portrait space. Nothing is uploaded and no picture is kept: the picture is only read here, for
   its light and dark, and then thrown away.

   - the face is levelled (rotated so the eyes are horizontal) and scaled to the same size every time, so a close-up and a
     far-away selfie give the same composition;
   - the lines come from the tracker's own connection sets: jaw, brows, eyelids, irises, lips; the nose and the neck are a few
     chosen landmarks;
   - the shading is hatching laid where THIS picture is dark, measured against THIS face's own light level (not an absolute
     brightness), so a darker skin tone gets the same structure as a lighter one, and a beard, shadows, thick brows and glasses
     frames come out as ink without any special case.
   Deterministic: the same face and seed always give the same drawing. */

export type Pt = [number, number];
export interface LM { x: number; y: number; z?: number }
type Conn = { start: number; end: number };
export interface FaceSets { lips: Conn[]; leftEye: Conn[]; rightEye: Conn[]; leftBrow: Conn[]; rightBrow: Conn[]; leftIris: Conn[]; rightIris: Conn[]; oval: Conn[] }
export type StrokeGroup = "oval" | "neck" | "nose" | "brow" | "eye" | "iris" | "lips" | "hatchA" | "hatchB";
export interface PStroke { g: StrokeGroup; p: number[]; len: number; w: number }
export interface Portrait { strokes: PStroke[]; faceCenter: Pt; jawBottom: number; eyeY: number }

export const PW = 800;
export const PH = 1000;

/* ---------- small helpers ---------- */
const mulberry = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const lenOf = (p: number[]) => { let s = 0; for (let i = 2; i < p.length; i += 2) s += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return s; };
const flat = (pts: Pt[]) => pts.flatMap((q) => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
const nodesOf = (c: Conn[]) => Array.from(new Set(c.flatMap((k) => [k.start, k.end])));

/** The connection pairs of one feature, ordered into pen strokes (a closed loop comes back with its first point repeated) */
export function chain(conns: Conn[]): number[][] {
  const adj = new Map<number, number[]>();
  const add = (a: number, b: number) => { const l = adj.get(a); if (l) l.push(b); else adj.set(a, [b]); };
  conns.forEach((c) => { add(c.start, c.end); add(c.end, c.start); });
  const used = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const nodes = Array.from(adj.keys());
  const order = [...nodes.filter((n) => adj.get(n)!.length === 1), ...nodes];
  const out: number[][] = [];
  for (const s of order) {
    const path = [s];
    let cur = s;
    for (;;) {
      const next = adj.get(cur)!.find((n) => !used.has(key(cur, n)));
      if (next === undefined) break;
      used.add(key(cur, next));
      path.push(next);
      cur = next;
    }
    if (path.length > 1) out.push(path);
  }
  return out;
}

function chaikin(pts: Pt[], rounds: number, closed: boolean): Pt[] {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    const n = p.length, q: Pt[] = [];
    const m = closed ? n : n - 1;
    if (!closed) q.push(p[0]);
    for (let i = 0; i < m; i++) {
      const a = p[i], b = p[(i + 1) % n];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}

/** Parallel pen lines across a polygon (scan lines in a rotated frame): how a brow, a pupil or the lips are inked in */
function fillHatch(poly: Pt[], angleDeg: number, spacing: number): Pt[][] {
  const a = (angleDeg * Math.PI) / 180, c = Math.cos(-a), s = Math.sin(-a), ci = Math.cos(a), si = Math.sin(a);
  const r = poly.map((p): Pt => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]);
  let y0 = 1e9, y1 = -1e9;
  r.forEach((p) => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  const lines: Pt[][] = [];
  let flip = false;
  for (let y = Math.ceil(y0 / spacing) * spacing + spacing / 2; y < y1; y += spacing) {
    const xs: number[] = [];
    for (let i = 0; i < r.length; i++) {
      const A = r[i], B = r[(i + 1) % r.length];
      if ((A[1] <= y && B[1] > y) || (B[1] <= y && A[1] > y)) xs.push(A[0] + ((y - A[1]) / (B[1] - A[1])) * (B[0] - A[0]));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const p0: Pt = [xs[k], y], p1: Pt = [xs[k + 1], y];
      const seg: Pt[] = (flip ? [p1, p0] : [p0, p1]).map((q): Pt => [q[0] * ci - q[1] * si, q[0] * si + q[1] * ci]);
      lines.push(seg);
    }
    flip = !flip;
  }
  return lines;
}

function maskFromPolys(add: Pt[][], remove: Pt[][], pad: number): Uint8Array {
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(PW, PH) : Object.assign(document.createElement("canvas"), { width: PW, height: PH });
  const g = cv.getContext("2d") as CanvasRenderingContext2D;
  const path = (poly: Pt[]) => { g.beginPath(); poly.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
  g.fillStyle = "#000"; g.strokeStyle = "#000";
  add.forEach((poly) => { path(poly); g.fill(); });
  g.globalCompositeOperation = "destination-out";
  g.lineWidth = pad * 2; g.lineJoin = "round";
  remove.forEach((poly) => { path(poly); g.fill(); g.stroke(); });
  const d = g.getImageData(0, 0, PW, PH).data;
  const m = new Uint8Array(PW * PH);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
  return m;
}

/** hatch lines laid wherever `inside` says so, as one continuous pen zig-zag where neighbouring runs allow it */
function hatchWhere(inside: (x: number, y: number) => boolean, angleDeg: number, spacing: number, rnd: () => number): Pt[][] {
  const th = (angleDeg * Math.PI) / 180, d = [Math.cos(th), Math.sin(th)], n = [-Math.sin(th), Math.cos(th)];
  const diag = Math.hypot(PW, PH), cx = PW / 2, cy = PH / 2;
  const strokes: Pt[][] = [];
  let cur: Pt[] | null = null, lineNo = 0;
  for (let s = -diag / 2; s <= diag / 2; s += spacing) {
    const runs: Array<[number, number]> = [];
    let run: [number, number] | null = null;
    for (let t = -diag / 2; t <= diag / 2; t += 1.5) {
      const x = cx + s * n[0] + t * d[0], y = cy + s * n[1] + t * d[1];
      const on = x >= 0 && y >= 0 && x < PW && y < PH && inside(x, y);
      if (on) { if (!run) run = [t, t]; else run[1] = t; } else if (run) { if (run[1] - run[0] >= 9) runs.push(run); run = null; }
    }
    if (run && run[1] - run[0] >= 9) runs.push(run);
    const flip = lineNo++ % 2 === 1;
    for (const r of flip ? [...runs].reverse() : runs) {
      const jx = (rnd() - 0.5) * 1.8, steps = Math.max(1, Math.round((r[1] - r[0]) / 18));
      const pts: Pt[] = [];
      for (let k = 0; k <= steps; k++) {
        const t = r[0] + ((r[1] - r[0]) * k) / steps, w = k && k < steps ? (rnd() - 0.5) * 1.5 : 0;
        pts.push([cx + (s + jx + w) * n[0] + t * d[0], cy + (s + jx + w) * n[1] + t * d[1]]);
      }
      if (flip) pts.reverse();
      const last = cur ? cur[cur.length - 1] : null;
      if (cur && last && Math.hypot(last[0] - pts[0][0], last[1] - pts[0][1]) < spacing * 2.4) cur.push(...pts);
      else { if (cur) strokes.push(cur); cur = [...pts]; }
    }
  }
  if (cur) strokes.push(cur);
  return strokes.filter((st) => lenOf(flat(st)) > 16);
}

/* ---------- the portrait ---------- */
export function buildPortrait(lm: LM[], img: { data: Uint8ClampedArray; width: number; height: number }, sets: FaceSets, seed = 7): Portrait | null {
  if (!lm || lm.length < 468) return null;
  const IW = img.width, IH = img.height;
  const P = (i: number): Pt => [lm[i].x * IW, lm[i].y * IH];
  const meanOf = (idx: number[]): Pt => { let x = 0, y = 0; idx.forEach((i) => { const p = P(i); x += p[0]; y += p[1]; }); return [x / idx.length, y / idx.length]; };

  // level the face, centre it, give it the same size every time
  const e1 = meanOf(nodesOf(sets.rightEye));
  const e2 = meanOf(nodesOf(sets.leftEye));
  const [eyeA, eyeB] = e1[0] <= e2[0] ? [e1, e2] : [e2, e1]; // whichever is on the left of the picture (it may be mirrored)
  const theta = Math.atan2(eyeB[1] - eyeA[1], eyeB[0] - eyeA[0]);
  const ovalIdx = nodesOf(sets.oval);
  const c0 = meanOf(ovalIdx);
  const cs = Math.cos(-theta), sn = Math.sin(-theta);
  const rot = (p: Pt): Pt => { const dx = p[0] - c0[0], dy = p[1] - c0[1]; return [dx * cs - dy * sn, dx * sn + dy * cs]; };
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  ovalIdx.forEach((i) => { const q = rot(P(i)); minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); });
  if (maxX - minX < 8 || maxY - minY < 8) return null;
  const s = Math.min(500 / (maxY - minY), 420 / (maxX - minX));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const FACE_C: Pt = [400, 410];
  const T = (p: Pt): Pt => { const q = rot(p); return [FACE_C[0] + (q[0] - cx) * s, FACE_C[1] + (q[1] - cy) * s]; };
  const Ti = (x: number, y: number): Pt => { // portrait -> picture
    const qx = (x - FACE_C[0]) / s + cx, qy = (y - FACE_C[1]) / s + cy, c = Math.cos(theta), sin = Math.sin(theta);
    return [c0[0] + qx * c - qy * sin, c0[1] + qx * sin + qy * c];
  };
  const map = (idx: number[]) => idx.map((i) => T(P(i)));
  const rnd = mulberry(seed);
  const strokes: PStroke[] = [];
  const push = (g: StrokeGroup, pts: Pt[], w: number) => { if (pts.length < 2) return; const f = flat(pts); strokes.push({ g, p: f, len: lenOf(f), w }); };

  // jaw: from one temple round the chin to the other (the forehead is left open, as in a sketch)
  const ovalChains = chain(sets.oval);
  const ovalLoop = ovalChains.sort((a, b) => b.length - a.length)[0];
  let jawBottom = FACE_C[1] + 260;
  let topArc: Pt[] = [];
  if (ovalLoop) {
    const body = ovalLoop[0] === ovalLoop[ovalLoop.length - 1] ? ovalLoop.slice(0, -1) : ovalLoop;
    const ia = body.indexOf(234), ib = body.indexOf(454), ic = body.indexOf(152);
    if (ia >= 0 && ib >= 0 && ic >= 0) {
      const n = body.length, fwd = (from: number, to: number) => { const o: number[] = []; for (let k = from; ; k = (k + 1) % n) { o.push(body[k]); if (k === to) break; } return o; };
      let jaw = fwd(ia, ib), top = fwd(ib, ia);
      if (!jaw.includes(152)) { const t = jaw; jaw = top.slice().reverse(); top = t.slice().reverse(); }
      const pts = chaikin(map(jaw), 2, false);
      push("oval", pts, 3.6);
      jawBottom = Math.max(...pts.map((q) => q[1]));
      topArc = map(top);
    }
  }
  const lm_ = (i: number) => T(P(i));
  // the neck, and the shoulders running out from it: a bust, so the card has something to stand on
  [172, 397].forEach((i) => {
    const a = lm_(i), dir = a[0] < FACE_C[0] ? -1 : 1, nb = jawBottom + 70, x = a[0] + dir * 6;
    const d = FACE_C[0] + dir * 380 - x; // from the neck out to just inside the card's edge (signed)
    push("neck", chaikin([a, [a[0] + dir * 3, a[1] + (nb - a[1]) * 0.45], [x, nb - 18], [x + d * 0.16, nb + 4], [x + d * 0.42, nb + 26], [x + d * 0.72, nb + 58], [x + d, nb + 104]], 3, false), 2.8);
  });
  // the nose: the bridge, the base with its wings, and the two sides
  push("nose", chaikin([168, 6, 197, 195, 5, 4].map(lm_), 2, false), 2.4);
  push("nose", chaikin([129, 98, 97, 2, 326, 327, 358].map(lm_), 2, false), 2.8);
  push("nose", chaikin([193, 122, 209].map(lm_), 2, false), 2.2);
  push("nose", chaikin([417, 351, 429].map(lm_), 2, false), 2.2);

  // brows, eyes, lips: outlines from the tracker, brows and lips inked in
  const browPolys: Pt[][] = [], eyePolys: Pt[][] = [], lipPolys: Pt[][] = [];
  chain(sets.leftBrow).concat(chain(sets.rightBrow)).forEach((c) => { const pts = map(c.length > 2 && c[0] === c[c.length - 1] ? c.slice(0, -1) : c); browPolys.push(pts); push("brow", chaikin(pts, 1, true).concat([chaikin(pts, 1, true)[0]]), 2.6); });
  browPolys.forEach((poly) => fillHatch(poly, -22, 3.3).forEach((seg) => push("brow", seg, 1.7)));
  chain(sets.leftEye).concat(chain(sets.rightEye)).forEach((c) => { const pts = map(c.length > 2 && c[0] === c[c.length - 1] ? c.slice(0, -1) : c); eyePolys.push(pts); const sm = chaikin(pts, 2, true); push("eye", sm.concat([sm[0]]), 2.8); });
  chain(sets.lips).forEach((c) => { const pts = map(c.length > 2 && c[0] === c[c.length - 1] ? c.slice(0, -1) : c); lipPolys.push(pts); const sm = chaikin(pts, 2, true); push("lips", sm.concat([sm[0]]), 3); });
  // lips: ink the area between the outer and the inner outline
  if (lipPolys.length >= 2) {
    const outer = lipPolys.reduce((a, b) => (a.length >= b.length ? a : b));
    fillHatch(outer, 6, 4.4).forEach((seg) => push("lips", seg, 1.6));
  }
  // irises: a ring and a dark pupil
  const irisSets: Array<[number, number[]]> = [[468, [469, 470, 471, 472]], [473, [474, 475, 476, 477]]];
  irisSets.forEach(([c, ring]) => {
    if (!lm[c] || !lm[ring[0]]) return;
    const C = lm_(c), r = ring.map((i) => Math.hypot(lm_(i)[0] - C[0], lm_(i)[1] - C[1])).reduce((a, b) => a + b, 0) / ring.length;
    const circle = (rr: number): Pt[] => Array.from({ length: 29 }, (_, k) => { const t = (k / 28) * Math.PI * 2 + 0.5; return [C[0] + Math.cos(t) * rr, C[1] + Math.sin(t) * rr] as Pt; });
    push("iris", circle(r), 2.4);
    fillHatch(circle(r * 0.55), 40, 2.6).forEach((seg) => push("iris", seg, 1.8));
  });

  // shading: hatch where this picture is darker than this face's own light level
  const eyeLine = (T(P(468 < lm.length ? 468 : 33))[1] + T(P(473 < lm.length ? 473 : 263))[1]) / 2;
  const faceOval = ovalChains.length ? map(ovalChains.sort((a, b) => b.length - a.length)[0].slice(0, -1)) : [];
  if (faceOval.length > 8) {
    const features = [...eyePolys, ...browPolys, ...lipPolys];
    const faceMask = maskFromPolys([faceOval], features, 9);
    // the hair (or a cap) sits just above the face: a band over the top of the oval, inked only where it is really dark
    const hairPoly: Pt[] = topArc.length > 4
      ? [...topArc, ...topArc.slice().reverse().map((p): Pt => [FACE_C[0] + (p[0] - FACE_C[0]) * 1.08, eyeLine + (p[1] - eyeLine) * 1.3])]
      : [];
    const mask = hairPoly.length ? maskFromPolys([faceOval, hairPoly], features, 9) : faceMask;
    const hairOnly = (x: number, y: number) => faceMask[(y | 0) * PW + (x | 0)] === 0;
    const lum = new Float32Array(IW * IH);
    for (let i = 0; i < lum.length; i++) lum[i] = 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
    // blur a little (two box passes) so skin texture and noise do not turn into ink
    const blur = (src: Float32Array, r: number) => {
      const tmp = new Float32Array(src.length), out = new Float32Array(src.length), k = 2 * r + 1;
      for (let y = 0; y < IH; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * IW + Math.min(IW - 1, Math.max(0, x))]; for (let x = 0; x < IW; x++) { tmp[y * IW + x] = acc / k; acc += src[y * IW + Math.min(IW - 1, x + r + 1)] - src[y * IW + Math.max(0, x - r)]; } }
      for (let x = 0; x < IW; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(IH - 1, Math.max(0, y)) * IW + x]; for (let y = 0; y < IH; y++) { out[y * IW + x] = acc / k; acc += tmp[Math.min(IH - 1, y + r + 1) * IW + x] - tmp[Math.max(0, y - r) * IW + x]; } }
      return out;
    };
    const L = blur(blur(lum, Math.max(2, Math.round(IW / 220))), Math.max(2, Math.round(IW / 220)));
    const at = (x: number, y: number) => { const p = Ti(x, y), px = Math.min(IW - 1, Math.max(0, p[0])), py = Math.min(IH - 1, Math.max(0, p[1])); const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(IW - 1, x0 + 1), y1 = Math.min(IH - 1, y0 + 1), fx = px - x0, fy = py - y0; return (L[y0 * IW + x0] * (1 - fx) + L[y0 * IW + x1] * fx) * (1 - fy) + (L[y1 * IW + x0] * (1 - fx) + L[y1 * IW + x1] * fx) * fy; };
    // this face's own light level: the lighter 60th percentile of the face (skin), and how much it varies
    const samples: number[] = [];
    for (let y = 0; y < PH; y += 5) for (let x = 0; x < PW; x += 5) if (faceMask[y * PW + x]) samples.push(at(x, y));
    samples.sort((a, b) => a - b);
    if (samples.length > 200) {
      const q = (f: number) => samples[Math.min(samples.length - 1, Math.floor(samples.length * f))];
      const mu = q(0.62), sigma = Math.max(7, (q(0.75) - q(0.25)) / 1.35);
      const dark = (x: number, y: number) => (mu - at(x, y)) / sigma;
      const inFace = (x: number, y: number) => mask[(y | 0) * PW + (x | 0)] === 1;
      // in the hair band the bar is higher (a dark room behind a bald head should not become hair)
      const lay = (th: number) => (x: number, y: number) => inFace(x, y) && dark(x, y) > (hairOnly(x, y) ? th + 0.9 : th);
      const upper = hatchWhere(lay(0.9), -62, 8.5, rnd), cross = hatchWhere(lay(2.0), 28, 11, rnd), deep = hatchWhere(lay(3.2), -12, 9, rnd);
      const all = [...upper, ...cross, ...deep].sort((a, b) => Math.min(...a.map((q2) => q2[1])) - Math.min(...b.map((q2) => q2[1])));
      const half = Math.ceil(all.length / 2);
      all.forEach((st, i) => push(i < half ? "hatchA" : "hatchB", st, 1.7));
    }
  }
  if (!strokes.length) return null;
  return { strokes, faceCenter: FACE_C, jawBottom, eyeY: eyeLine };
}
