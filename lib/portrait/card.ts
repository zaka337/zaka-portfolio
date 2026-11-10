import type { Portrait, Pt } from "@/lib/portrait/strokes";
import { SITE_URL } from "@/lib/site";

/* The shareable card. The stage the five cursors draw on in components/portrait IS this card (same size, same helpers), so what the
   visitor watches is exactly what they can save. Vectors again at the end: the picture is sharp at any size.
   Always cream paper and dark ink, whatever theme the site is in: it is meant to look like a printed card.
   Nothing here leaves the device; the blob only exists for "Save" and "Share", when the visitor presses them. */

export const CARD_W = 1080;
export const CARD_H = 1350;
export const PAPER = "#f4f1ea";
export const INK = "#161616";
export const DEFAULT_STACK = "ink by Next.js / React / TypeScript / Three.js / CSS";
const SCALE = 1.2, OX = 60, OY = -4; // portrait space (800 x 1000) -> card

/** a point of the portrait on the card */
export const toCard = (x: number, y: number): Pt => [x * SCALE + OX, y * SCALE + OY];
export const CARD_SCALE = SCALE;

/** a stroke (flat x,y list, in card coordinates) with its length and width */
export interface Src { pts: number[]; cum: number[]; len: number; w: number }
export function makeSrc(pts: number[], w: number): Src {
  const cum = [0];
  for (let i = 2; i < pts.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
  return { pts, cum, len: cum[cum.length - 1], w };
}
export const portraitSrcs = (p: Portrait): Src[] => p.strokes.map((s) => {
  const q: number[] = [];
  for (let i = 0; i < s.p.length; i += 2) { const c = toCard(s.p[i], s.p[i + 1]); q.push(c[0], c[1]); }
  return makeSrc(q, s.w * 1.04);
});

/** the card's frame, as one pen path (top left, round the corners and back) */
export const FRAME_SRC = makeSrc([34, 34, CARD_W - 34, 34, CARD_W - 34, CARD_H - 34, 34, CARD_H - 34, 34, 34], 1.8);

/** where along a stroke (0..1) is the point */
export function pointAt(s: Src, f: number): Pt {
  if (s.pts.length < 4) return [s.pts[0], s.pts[1]];
  const L = Math.max(0, Math.min(1, f)) * s.len;
  let i = 1;
  while (i < s.cum.length - 1 && s.cum[i] < L) i++;
  const a = s.cum[i - 1], b = s.cum[i], u = b > a ? (L - a) / (b - a) : 0;
  return [s.pts[(i - 1) * 2] + (s.pts[i * 2] - s.pts[(i - 1) * 2]) * u, s.pts[(i - 1) * 2 + 1] + (s.pts[i * 2 + 1] - s.pts[(i - 1) * 2 + 1]) * u];
}

/** ink the part of a stroke between f0 and f1 (fractions of its length) */
export function paintPart(g: CanvasRenderingContext2D, s: Src, f0: number, f1: number, color = INK, alpha = 1) {
  if (f1 <= f0 || s.len <= 0) return;
  const L0 = f0 * s.len, L1 = f1 * s.len;
  g.save();
  g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = s.w; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  let started = false;
  for (let i = 1; i < s.cum.length; i++) {
    const a = s.cum[i - 1], b = s.cum[i];
    if (b <= L0) continue;
    if (a >= L1) break;
    const x0 = s.pts[(i - 1) * 2], y0 = s.pts[(i - 1) * 2 + 1], x1 = s.pts[i * 2], y1 = s.pts[i * 2 + 1], d = b - a || 1;
    const ua = Math.max(0, (L0 - a) / d), ub = Math.min(1, (L1 - a) / d);
    if (!started) { g.moveTo(x0 + (x1 - x0) * ua, y0 + (y1 - y0) * ua); started = true; }
    g.lineTo(x0 + (x1 - x0) * ub, y0 + (y1 - y0) * ub);
  }
  g.stroke();
  g.restore();
}

export function paintPaper(g: CanvasRenderingContext2D) {
  g.fillStyle = PAPER; g.fillRect(0, 0, CARD_W, CARD_H);
  g.fillStyle = "rgba(22,22,22,0.10)"; // a fine dotted grid, like the site's paper
  for (let y = 36; y < CARD_H; y += 36) for (let x = 36; x < CARD_W; x += 36) g.fillRect(x, y, 1.6, 1.6);
}
export function paintTicks(g: CanvasRenderingContext2D) {
  g.save(); g.strokeStyle = INK; g.lineWidth = 3.4; g.lineCap = "round";
  const tick = (x: number, y: number, dx: number, dy: number) => { g.beginPath(); g.moveTo(x, y + dy * 28); g.lineTo(x, y); g.lineTo(x + dx * 28, y); g.stroke(); };
  tick(34, 34, 1, 1); tick(CARD_W - 34, 34, -1, 1); tick(34, CARD_H - 34, 1, -1); tick(CARD_W - 34, CARD_H - 34, -1, -1);
  g.restore();
}

export interface CapLine { text: string; font: string; fill: string; x: number; y: number }
export function captionLines(name: string, stack = DEFAULT_STACK): CapLine[] {
  const n = name.trim();
  const host = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return [
    { text: n ? `Portrait of ${n}` : "A portrait in ink", font: '700 46px "Helvetica Neue", Helvetica, Arial, sans-serif', fill: INK, x: 96, y: 1186 },
    { text: stack, font: '500 21px ui-monospace, "SF Mono", Menlo, Consolas, monospace', fill: "rgba(22,22,22,0.7)", x: 96, y: 1228 },
    { text: host, font: '700 21px ui-monospace, "SF Mono", Menlo, Consolas, monospace', fill: INK, x: 96, y: 1280 },
  ];
}
/** letters n0..n1 of a caption line (typed in as they come) */
export function paintText(g: CanvasRenderingContext2D, l: CapLine, n0: number, n1: number) {
  if (n1 <= n0) return;
  g.save(); g.font = l.font; g.fillStyle = l.fill; g.textBaseline = "alphabetic";
  g.fillText(l.text.slice(n0, n1), l.x + (n0 ? g.measureText(l.text.slice(0, n0)).width : 0), l.y);
  g.restore();
}
export function textEndX(g: CanvasRenderingContext2D, l: CapLine, n: number) {
  g.save(); g.font = l.font; const w = n ? g.measureText(l.text.slice(0, n)).width : 0; g.restore();
  return l.x + w;
}
/** the site's full stop, the last thing on the card */
export function paintMark(g: CanvasRenderingContext2D) { g.fillStyle = INK; g.beginPath(); g.arc(CARD_W - 112, 1270, 11, 0, Math.PI * 2); g.fill(); }

export interface CardOpts { name: string; stack?: string }

/** The whole card at once (for Save and Share, and for people who asked for less motion) */
export function renderCard(srcs: Src[], opts: CardOpts, into?: HTMLCanvasElement): HTMLCanvasElement {
  const cv = into ?? document.createElement("canvas");
  cv.width = CARD_W; cv.height = CARD_H;
  const g = cv.getContext("2d")!;
  paintPaper(g);
  paintPart(g, FRAME_SRC, 0, 1);
  paintTicks(g);
  srcs.forEach((s) => paintPart(g, s, 0, 1));
  captionLines(opts.name, opts.stack).forEach((l) => paintText(g, l, 0, l.text.length));
  paintMark(g);
  return cv;
}

const toBlob = (cv: HTMLCanvasElement) => new Promise<Blob | null>((res) => cv.toBlob((b) => res(b), "image/png"));
export async function cardBlob(srcs: Src[], opts: CardOpts): Promise<Blob | null> { return toBlob(renderCard(srcs, opts)); }

export function saveBlob(blob: Blob, name = "portrait-in-ink.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** The share sheet with the picture in it where the browser can (phones); false means "save the file instead" */
export async function shareBlob(blob: Blob, text: string, name = "portrait-in-ink.png"): Promise<boolean> {
  try {
    const file = new File([blob], name, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: "Portrait in ink", text });
      return true;
    }
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return true; // they closed the sheet: that is an answer, not a failure
  }
  return false;
}
