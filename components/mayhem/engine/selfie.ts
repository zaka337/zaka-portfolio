/* Your face as the driver's face. A photo (from the camera or a file) is cropped to a square, turned
   into a flat cartoon (smoothed, a few tones, ink outlines) and given a soft oval edge, all on a
   small canvas right here in the browser. Nothing is uploaded anywhere. The result is kept only in
   this tab's session storage so the face survives a page reload, and goes when the tab closes.
   The driver's head wraps it around the front of the ball (components/mayhem/engine/cars.ts). */

export interface Selfie { canvas: HTMLCanvasElement; skin: number }
export interface Crop { zoom: number; cx: number; cy: number; mirror: boolean }

const N = 256;
const KEY = "zk-mayhem-face";
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** A box blur (clamped at the edges) of `ch` interleaved channels, `passes` times */
function blur(src: Float32Array, w: number, h: number, ch: number, r: number, passes = 2) {
  let cur = src;
  const n = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    const tmp = new Float32Array(cur.length), out = new Float32Array(cur.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += cur[(y * w + clamp(x + k, 0, w - 1)) * ch + c];
      tmp[(y * w + x) * ch + c] = sum / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[(clamp(y + k, 0, h - 1) * w + x) * ch + c];
      out[(y * w + x) * ch + c] = sum / n;
    }
    cur = out;
  }
  return cur;
}

/** The square piece of the source that the crop chooses, as [sx, sy, side] */
export function cropRect(sw: number, sh: number, c: Crop): [number, number, number] {
  const side = Math.min(sw, sh) / clamp(c.zoom, 1, 4);
  const sx = clamp(c.cx * sw - side / 2, 0, sw - side), sy = clamp(c.cy * sh - side / 2, 0, sh - side);
  return [sx, sy, side];
}

export function makeSelfie(src: CanvasImageSource, sw: number, sh: number, crop: Crop): Selfie {
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  const [sx, sy, side] = cropRect(sw, sh, crop);
  if (crop.mirror) { g.translate(N, 0); g.scale(-1, 1); }
  g.imageSmoothingQuality = "high";
  g.drawImage(src, sx, sy, side, side, 0, 0, N, N);
  g.setTransform(1, 0, 0, 1, 0, 0);

  const img = g.getImageData(0, 0, N, N);
  const d = img.data;
  const rgb = new Float32Array(N * N * 3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { rgb[j] = d[i]; rgb[j + 1] = d[i + 1]; rgb[j + 2] = d[i + 2]; }

  // flat colour regions: blur the colours, keep a blurred brightness for the outlines
  const soft = blur(rgb, N, N, 3, 2, 2);
  const lum = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) lum[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  const lumS = blur(lum, N, N, 1, 1, 1);

  let skinR = 0, skinG = 0, skinB = 0, skinN = 0;
  const LEVELS = 5;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    let r = soft[i * 3], gr = soft[i * 3 + 1], b = soft[i * 3 + 2];
    const l = 0.299 * r + 0.587 * gr + 0.114 * b;
    // a few tones of brightness, keeping the hue, a little more colour than the photo had
    const q = (Math.floor((l / 255) * LEVELS + 0.5) / LEVELS) * 255;
    const mix = 0.72;                                   // how hard the tones are stepped
    const target = l * (1 - mix) + q * mix;
    const k = l > 1 ? target / l : 1;
    r *= k; gr *= k; b *= k;
    const gray = 0.299 * r + 0.587 * gr + 0.114 * b;
    r = gray + (r - gray) * 1.22; gr = gray + (gr - gray) * 1.22; b = gray + (b - gray) * 1.22;
    // ink where the brightness changes quickly
    const x0 = Math.max(0, x - 1), x1 = Math.min(N - 1, x + 1), y0 = Math.max(0, y - 1), y1 = Math.min(N - 1, y + 1);
    const gx = lumS[y * N + x1] - lumS[y * N + x0];
    const gy = lumS[y1 * N + x] - lumS[y0 * N + x];
    const e = Math.sqrt(gx * gx + gy * gy);
    const ink = smooth(12, 34, e) * 0.7;
    r *= 1 - ink; gr *= 1 - ink; b *= 1 - ink;
    // soft oval edge
    const dx = (x / N - 0.5) / 0.47, dy = (y / N - 0.5) / 0.53;
    const a = 1 - smooth(0.72, 1.0, Math.sqrt(dx * dx + dy * dy));
    d[i * 4] = clamp(r, 0, 255); d[i * 4 + 1] = clamp(gr, 0, 255); d[i * 4 + 2] = clamp(b, 0, 255);
    d[i * 4 + 3] = Math.round(a * 255);
    // the colour of the skin: two cheeks and the forehead, before the ink
    const fx = x / N, fy = y / N;
    if ((Math.abs(fx - 0.33) < 0.04 && Math.abs(fy - 0.6) < 0.04) || (Math.abs(fx - 0.67) < 0.04 && Math.abs(fy - 0.6) < 0.04) || (Math.abs(fx - 0.5) < 0.05 && Math.abs(fy - 0.3) < 0.03)) {
      skinR += soft[i * 3]; skinG += soft[i * 3 + 1]; skinB += soft[i * 3 + 2]; skinN++;
    }
  }
  g.putImageData(img, 0, 0);
  const s = skinN ? [skinR / skinN, skinG / skinN, skinB / skinN] : [225, 180, 150];
  return { canvas: cv, skin: (Math.round(s[0]) << 16) | (Math.round(s[1]) << 8) | Math.round(s[2]) };
}

// ── kept for this tab only ──
export function saveSelfie(s: Selfie | null) {
  try {
    if (!s) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify({ png: s.canvas.toDataURL("image/png"), skin: s.skin }));
  } catch { /* private mode or full: it just will not survive a reload */ }
}

export function loadSelfie(): Promise<Selfie | null> {
  return new Promise((resolve) => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return resolve(null);
      const o = JSON.parse(raw) as { png: string; skin: number };
      if (typeof o.png !== "string" || !o.png.startsWith("data:image/png")) return resolve(null);
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = cv.height = N;
        cv.getContext("2d")!.drawImage(im, 0, 0, N, N);
        resolve({ canvas: cv, skin: Number(o.skin) || 0xe0b090 });
      };
      im.onerror = () => resolve(null);
      im.src = o.png;
    } catch { resolve(null); }
  });
}
