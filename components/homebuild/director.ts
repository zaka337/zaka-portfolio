/* The multi-cursor build of the home screen. Five cursors, each a "collaborator" with one job, assemble the home screen from
   the top down, draw the avatar's head in ink (the real head's own lines, baked by scripts/bake-face-lines.mjs) while the 3D
   model finishes loading behind it, and then all take hold of the head's frame; on their shared click the real head dissolves
   in through the sketch and the cursors turn back into full stops and leave.

   Design rules:
   - It only changes inline styles of existing elements (all put back in finish()) and never touches HomeScreen's structure.
     Blocks move with the CSS `translate`/`scale`/`rotate` properties because several of them already use `transform`.
   - One timeline, a pure function of time (render(t)): any frame can be drawn on demand (/?build=1&t=2.4).
   - Smoothness: time-based only (never per-frame constants, so 60 and 120 Hz look the same), transforms/opacity/clip-path
     only, one rAF loop, every DOM node looked up once, every style write skipped when the value did not change, finished
     tracks do nothing, no allocations worth mentioning per frame.
   - The 3D head freezes the page in several waves (about 130 ms, then 200-400 ms, then 100 ms: shader compile, texture upload)
     over the first ~2.5 s. Measured on a real GPU, no part of the choreography survives that smoothly, so the build lets the
     head build behind the loader exactly as the site always has, and starts the choreography only once the head reports ready
     (plus a short settle), capped so a slow device still gets its intro.
   - Anything can skip it (click, key, scroll, touch). A watchdog and a try/catch always end in the plain home. */

import { isNight } from "@/lib/sleep";
import { FACE_BRIM, FACE_H, FACE_STROKES, FACE_W, type FaceStroke } from "./faceLines";

type V2 = [number, number];
type Rect = { l: number; t: number; w: number; h: number; r: number; b: number; cx: number; cy: number };
export interface BuildStats { frames: number; mean: number; p95: number; max: number; preroll: number }
export interface BuildHandle { duration: number; seek(t: number): void; skip(): void; destroy(): void; stats(): BuildStats; done: boolean }

/* ---------- maths ---------- */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const E = {
  out3: (u: number) => 1 - Math.pow(1 - u, 3),
  io2: (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  io3: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  back: (u: number, s = 1.5) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
  /** a pen mostly keeps its speed from stroke to stroke: only a gentle ease at the ends, not a stop and start every time */
  pen: (u: number) => u + 0.4 * ((u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) - u),
};
const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** a quadratic arc from a to b: the pen-up travel of a hand, never a straight line */
function arc(a: V2, b: V2, u: number, bend: number): V2 {
  const e = E.io3(u), d = dist(a, b) || 1;
  const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
  const cx = (a[0] + b[0]) / 2 + nx * bend * d, cy = (a[1] + b[1]) / 2 + ny * bend * d;
  const w = 1 - e;
  return [w * w * a[0] + 2 * w * e * cx + e * e * b[0], w * w * a[1] + 2 * w * e * cy + e * e * b[1]];
}
function pointAt(p: number[], len: number): V2 {
  let acc = 0;
  for (let i = 2; i < p.length; i += 2) {
    const sl = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    if (acc + sl >= len && sl > 0) { const u = (len - acc) / sl; return [lerp(p[i - 2], p[i], u), lerp(p[i - 1], p[i + 1], u)]; }
    acc += sl;
  }
  return [p[p.length - 2], p[p.length - 1]];
}
function drawPart(ctx: CanvasRenderingContext2D, p: number[], from: number, to: number) {
  let acc = 0;
  ctx.beginPath();
  for (let i = 2; i < p.length; i += 2) {
    const x0 = p[i - 2], y0 = p[i - 1], x1 = p[i], y1 = p[i + 1], sl = Math.hypot(x1 - x0, y1 - y0);
    if (acc + sl > from && acc < to && sl > 0) {
      const u0 = Math.max(0, (from - acc) / sl), u1 = Math.min(1, (to - acc) / sl);
      ctx.moveTo(lerp(x0, x1, u0), lerp(y0, y1, u0));
      ctx.lineTo(lerp(x0, x1, u1), lerp(y0, y1, u1));
    }
    acc += sl;
  }
  ctx.stroke();
}

/* ---------- the plan: who does what, and when (seconds) ---------- */
type CId = "c1" | "c2" | "c3" | "c4" | "c5";
type Key = "title" | "sayhi" | "about" | "role" | "projects" | "contact" | "badge" | "tools" | "status" | "ghost";
type Task =
  | { k: "frame"; el: Key; c: CId; t: V2 }
  | { k: "guide"; c: CId; t: V2 }
  | { k: "drop"; el: Key; c: CId; t: V2; from: "right" | "bottom"; snap?: number }
  | { k: "type2" | "type1"; el: Key; c: CId; t: V2 }
  | { k: "pop"; el: Key; c: CId; t: V2 }
  | { k: "wipe"; el: Key; c: CId; t: V2 }
  | { k: "strokes"; c: CId; groups: FaceStroke["g"][]; t: V2 }
  | { k: "brim"; c: CId; t: V2 };
interface Plan { tasks: Task[]; spawnT: Partial<Record<CId, number>>; hold: number; release: number; handle: Partial<Record<CId, "tl" | "tr" | "br" | "bl" | "bm">>; exit: V2; end: number }

const DESKTOP: Plan = {
  tasks: [
    { k: "frame", el: "title", c: "c1", t: [0.35, 1.15] },
    { k: "guide", c: "c1", t: [1.45, 1.8] },
    { k: "drop", el: "sayhi", c: "c2", t: [0.55, 1.8], from: "right", snap: 1.6 },
    { k: "type2", el: "about", c: "c3", t: [1.0, 2.0] },
    { k: "drop", el: "role", c: "c1", t: [2.15, 2.95], from: "right" },
    { k: "drop", el: "contact", c: "c2", t: [2.95, 3.65], from: "bottom" },
    { k: "drop", el: "projects", c: "c1", t: [3.1, 3.8], from: "bottom" },
    { k: "type1", el: "status", c: "c3", t: [3.0, 3.6] },
    { k: "pop", el: "badge", c: "c2", t: [3.65, 3.95] },
    { k: "pop", el: "tools", c: "c3", t: [3.65, 3.95] },
    { k: "wipe", el: "ghost", c: "c5", t: [0.55, 1.4] },
    { k: "strokes", c: "c4", groups: ["sil"], t: [0.9, 2.1] },
    { k: "brim", c: "c4", t: [2.1, 2.6] },
    { k: "strokes", c: "c4", groups: ["cap"], t: [2.6, 3.0] },
    { k: "strokes", c: "c4", groups: ["crown"], t: [3.0, 3.8] },
    { k: "strokes", c: "c5", groups: ["feat"], t: [1.5, 2.8] },
    { k: "strokes", c: "c5", groups: ["beard"], t: [2.8, 3.9] },
  ],
  spawnT: { c1: 0, c2: 0.1, c3: 0.3, c4: 0.2, c5: 0.4 },
  hold: 4.3, release: 4.65, handle: { c4: "tl", c5: "tr", c2: "br", c1: "bl", c3: "bm" }, exit: [5.45, 6.15], end: 6.25,
};
const LITE: Plan = {
  tasks: [
    { k: "frame", el: "title", c: "c1", t: [0.25, 0.8] },
    { k: "drop", el: "sayhi", c: "c1", t: [0.95, 1.5], from: "right" },
    { k: "strokes", c: "c4", groups: ["sil"], t: [0.5, 1.4] },
    { k: "brim", c: "c4", t: [1.4, 1.75] },
    { k: "strokes", c: "c4", groups: ["cap"], t: [1.75, 2.05] },
    { k: "strokes", c: "c4", groups: ["feat"], t: [2.05, 2.75] },
    { k: "strokes", c: "c4", groups: ["crownLite", "beardLite"], t: [2.75, 3.4] },
    { k: "drop", el: "about", c: "c3", t: [1.6, 2.1], from: "bottom" },
    { k: "drop", el: "role", c: "c3", t: [2.2, 2.7], from: "bottom" },
    { k: "drop", el: "projects", c: "c1", t: [2.3, 2.8], from: "bottom" },
    { k: "drop", el: "contact", c: "c1", t: [2.9, 3.4], from: "bottom" },
    { k: "pop", el: "badge", c: "c3", t: [3.0, 3.3] },
    { k: "pop", el: "tools", c: "c3", t: [3.35, 3.65] },
  ],
  spawnT: { c1: 0, c3: 0.2, c4: 0.1 },
  hold: 3.7, release: 3.95, handle: { c4: "tl", c1: "br", c3: "bm" }, exit: [4.7, 5.2], end: 5.3,
};

const SEL: Record<Key, string> = {
  title: ".block-tl", sayhi: ".block-tr", about: ".block-ml", role: ".block-mr", projects: ".block-bl", contact: ".block-br",
  badge: ".home-play-wrap", tools: ".home-tools-wrap", status: ".home-status", ghost: ".home-ghost",
};
const MAX_WAIT = 8;      // seconds the cursors will wait for the 3D head before carrying on
const PREROLL_MAX = 3.5; // seconds the loader may keep covering the page while the 3D head builds; then the build starts anyway
const SETTLE_MS = 280;   // quiet time after the head reports ready, so the first visible frames of the intro are clean
const ALL: CId[] = ["c1", "c2", "c3", "c4", "c5"];

export function startBuild(layer: HTMLElement, opts: { lite: boolean; seek?: number; speed?: number }): BuildHandle | null {
  const root = document.documentElement;
  const plan = opts.lite ? LITE : DESKTOP;
  const speed = opts.speed && opts.speed > 0 ? opts.speed : 1; // 0.5 = slow motion, for judging the choreography
  const scene = document.querySelector<HTMLElement>(".avatar-scene");
  if (!scene) return null;
  const S: HTMLElement = scene; // (kept non-null for the closures below)
  // At night in Islamabad the site's own sleep feature has the head nod off, so the awake sketch cannot match it: it is dropped
  // quickly before the head shows through, and nobody says hello to a sleeper.
  let asleep = false;
  try { asleep = isNight() && sessionStorage.getItem("zk-awake") !== "1"; } catch { asleep = isNight(); }
  const vw = window.innerWidth, vh = window.innerHeight;
  const ink = getComputedStyle(root).getPropertyValue("--ink").trim() || "#0d0d0d";

  /* ---------- every DOM node, looked up once; every style write skipped when nothing changed ---------- */
  const memo = new WeakMap<HTMLElement, Record<string, string>>();
  const sw = (e: HTMLElement, prop: string, v: string) => {
    let m = memo.get(e);
    if (!m) { m = {}; memo.set(e, m); }
    if (m[prop] === v) return;
    m[prop] = v;
    e.style.setProperty(prop, v);
  };
  const el = (n: string) => layer.querySelector<HTMLElement>(`[data-zb-el="${n}"]`) as HTMLElement;
  const ref = {
    grid: el("grid"), marks: el("marks"), guide: el("guide"), caret: el("caret"), sketch: el("sketch") as unknown as HTMLCanvasElement,
    titleFrame: el("titleFrame"), headFrame: el("headFrame"),
    sel: [0, 1, 2, 3].map((n) => el(`sel${n}`)), rip: Array.from({ length: 16 }, (_, n) => el(`rip${n}`)),
  };
  const titleLab = ref.titleFrame.querySelector<HTMLElement>(".zb-label")!;
  const headLab = ref.headFrame.querySelector<HTMLElement>(".zb-label")!;
  const lastText = new WeakMap<HTMLElement, string>();
  const setText = (e: HTMLElement, s: string) => { if (lastText.get(e) === s) return; lastText.set(e, s); e.textContent = s; };

  /* ---------- measure everything once, before anything is moved ---------- */
  const rectOf = (e: Element | null): Rect | null => {
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2 ? { l: r.left, t: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } : null;
  };
  const els = {} as Record<Key, HTMLElement | null>;
  const R = {} as Record<Key, Rect | null>;
  (Object.keys(SEL) as Key[]).forEach((k) => { els[k] = document.querySelector<HTMLElement>(SEL[k]); R[k] = rectOf(els[k]); });
  const sr = S.getBoundingClientRect();
  // Calibrated against the real 3D head (its silhouette measured at 1280x720, 1440x900, 1920x1080, 360x740 and 390x844, pointer
  // centred, head awake): exactly the size of the still picture, shifted left and a little vertically. The head also sways idly by
  // about +-10 px, so no static drawing can match it at every moment; x uses the median of 10 samples.
  const phone = window.matchMedia("(max-width: 768px)").matches;
  const fh = sr.height * 0.6309, fw = (fh * FACE_W) / FACE_H;
  const fl = sr.left + sr.width / 2 - fw / 2 - (phone ? 0.019 : 0.017) * sr.height;
  const ft = sr.top + sr.height * 0.4891 - fh / 2 + (phone ? 0.009 : -0.01) * sr.height, fs = fh / FACE_H;
  const P = (x: number, y: number): V2 => [fl + x * fs, ft + y * fs];

  /* ---------- the five collaborators ---------- */
  interface Beat { t0: number; t1: number; at: (t: number) => V2; beam?: boolean }
  interface Actor { id: CId; node: HTMLElement; glyph: HTMLElement; chip: HTMLElement; beats: Beat[]; spawn: V2; spawnT: number; bend: number; px: number; py: number; tilt: number; hold: V2 }
  const spawnAt: Record<CId, V2> = { c1: [-40, -40], c2: [vw + 40, 24], c3: [-40, vh * 0.5], c4: [-40, vh * 0.84], c5: [vw * 0.6, -44] };
  const bends: Record<CId, number> = { c1: 0.18, c2: -0.2, c3: 0.14, c4: -0.16, c5: 0.22 };
  const actors: Partial<Record<CId, Actor>> = {};
  ALL.forEach((id) => {
    const used = plan.tasks.some((t) => t.c === id) || id in plan.handle;
    const node = el(`cur-${id}`);
    if (!used) { sw(node, "display", "none"); return; }
    sw(node, "display", "");
    actors[id] = { id, node, glyph: node.firstElementChild as HTMLElement, chip: node.querySelector<HTMLElement>(".zb-chip")!, beats: [], spawn: spawnAt[id], spawnT: plan.spawnT[id] ?? 0, bend: bends[id], px: spawnAt[id][0], py: spawnAt[id][1], tilt: 0, hold: spawnAt[id] };
  });
  const actorList = ALL.filter((id) => actors[id]).map((id) => actors[id]!);

  const tracks: Array<(t: number) => void> = [];
  const inits: Array<() => void> = [];
  const ripples: Array<{ t: number; at: () => V2; color: string }> = [];
  const covered = new Set<Key>();
  const colorOf = (id: CId) => getComputedStyle(actors[id]!.node).getPropertyValue("--c").trim() || ink;
  const setBeat = (c: CId, b: Beat) => { actors[c]?.beats.push(b); };
  /** a track that only runs while something is happening: the state before it starts and after it ends is applied once */
  const phased = (a: number, end: number, fn: (t: number) => void) => {
    let ph = -1;
    return (t: number) => { const p = t < a ? 0 : t > end ? 2 : 1; if (p !== 1 && p === ph) return; ph = p; fn(t); };
  };
  let selNo = 0;

  /* ---------- sketch canvas (the head, drawn in ink) ---------- */
  const cv = ref.sketch;
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  if (fw * fh * dpr * dpr > 1.8e6) dpr = Math.max(1, Math.sqrt(1.8e6 / (fw * fh)));
  sw(cv, "left", `${fl}px`); sw(cv, "top", `${ft}px`); sw(cv, "width", `${fw}px`); sw(cv, "height", `${fh}px`);
  cv.width = Math.round(fw * dpr); cv.height = Math.round(fh * dpr);
  const ctx = cv.getContext("2d")!;
  const lineW: Record<string, number> = { sil: 2.9, cap: 2.1, feat: 2.0, crown: 1.5, crownLite: 1.6, beard: 1.5, beardLite: 1.6 };
  const slots: Array<{ s: FaceStroke; a: number; b: number; d0: number; drawn: number }> = [];
  const brim = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9, done: 0, a: 0, b: 0, on: false };
  for (let i = 0; i < FACE_BRIM.length; i += 2) { brim.minX = Math.min(brim.minX, FACE_BRIM[i]); brim.maxX = Math.max(brim.maxX, FACE_BRIM[i]); brim.minY = Math.min(brim.minY, FACE_BRIM[i + 1]); brim.maxY = Math.max(brim.maxY, FACE_BRIM[i + 1]); }
  const resetSketch = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); slots.forEach((s) => (s.drawn = 0)); brim.done = brim.minX; };

  /* ---------- tasks -> tracks, beats, ripples ---------- */
  const guideX = R.sayhi ? R.sayhi.r : vw * 0.96;
  const place = (e: HTMLElement, tx: number, ty: number, rot: number, op: number, sc = 1) => {
    sw(e, "translate", `${tx.toFixed(1)}px ${ty.toFixed(1)}px`);
    sw(e, "rotate", `${rot.toFixed(2)}deg`);
    sw(e, "opacity", op.toFixed(3));
    sw(e, "scale", sc.toFixed(3));
  };
  const showSel = (n: number, r: Rect, tx: number, ty: number, a: number) => {
    const s = ref.sel[n];
    sw(s, "opacity", a.toFixed(3));
    sw(s, "transform", `translate(${(r.l + tx).toFixed(1)}px,${(r.t + ty).toFixed(1)}px)`);
    sw(s, "width", `${r.w}px`); sw(s, "height", `${r.h}px`);
  };

  for (const task of plan.tasks) {
    const [a, b] = task.t;
    if (task.k === "frame") {
      const r = R[task.el], e = els[task.el];
      if (!r || !e) continue;
      covered.add(task.el);
      const fr = ref.titleFrame, pad = 8;
      const p = (t: number) => E.io3(seg(t, a, b));
      inits.push(() => { e.setAttribute("data-zb", ""); e.style.opacity = "0.01"; e.style.clipPath = "inset(0 100% 100% 0)"; });
      tracks.push(phased(a - 0.06, b + 0.35, (t) => {
        const u = p(t);
        sw(e, "opacity", t < a ? "0.01" : "1");
        sw(e, "clip-path", u >= 1 ? "none" : `inset(0 ${((1 - u) * 100).toFixed(2)}% ${((1 - u) * 100).toFixed(2)}% 0)`);
        sw(e, "translate", `0px ${((1 - u) * 10).toFixed(1)}px`);
        const w = (r.w + pad * 2) * u, h = (r.h + pad * 2) * u;
        sw(fr, "opacity", (t < a - 0.05 ? 0 : 1 - seg(t, b, b + 0.3)).toFixed(3));
        sw(fr, "transform", `translate(${r.l - pad}px,${r.t - pad}px)`);
        sw(fr, "width", `${w.toFixed(1)}px`); sw(fr, "height", `${h.toFixed(1)}px`);
        setText(titleLab, `W ${Math.round(w)} · H ${Math.round(h)}`);
      }));
      setBeat(task.c, { t0: a, t1: b, at: (t) => [r.l - pad + (r.w + pad * 2) * p(t), r.t - pad + (r.h + pad * 2) * p(t)] });
      ripples.push({ t: b, at: () => [r.r + pad, r.b + pad], color: colorOf(task.c) });
    } else if (task.k === "guide") {
      const g = ref.guide;
      const snapEnd = DESKTOP.tasks.find((x) => x.k === "drop" && x.el === "sayhi");
      const fadeAt = (snapEnd && snapEnd.k === "drop" && snapEnd.snap ? snapEnd.t[1] : b) + 0.5;
      tracks.push(phased(a, fadeAt + 0.45, (t) => {
        sw(g, "left", `${guideX}px`); sw(g, "height", `${vh}px`);
        sw(g, "transform", `scaleY(${E.io3(seg(t, a, b)).toFixed(3)})`);
        sw(g, "opacity", (t < a ? 0 : 0.6 * (1 - seg(t, fadeAt, fadeAt + 0.4))).toFixed(3));
      }));
      setBeat(task.c, { t0: a, t1: b, at: (t) => [guideX, 6 + (vh - 12) * E.io3(seg(t, a, b))] });
    } else if (task.k === "drop") {
      const r = R[task.el], e = els[task.el];
      if (!r || !e) continue;
      covered.add(task.el);
      const sx = task.from === "right" ? vw - r.l + 40 : 0, sy = task.from === "right" ? -30 : 90, srot = task.from === "right" ? 5 : 0;
      const hov = task.snap ? ([14, -4, 1.2] as const) : ([0, 0, 0] as const), m1 = task.snap ?? b;
      const sn = selNo++ % 4;
      const st = (t: number) => {
        if (t <= m1) { const u = E.out3(seg(t, a, m1)); return [lerp(sx, hov[0], u), lerp(sy, hov[1], u), lerp(srot, hov[2], u)]; }
        const u = E.back(seg(t, m1, b), 2.2);
        return [lerp(hov[0], 0, u), lerp(hov[1], 0, u), lerp(hov[2], 0, u)];
      };
      inits.push(() => { e.setAttribute("data-zb", ""); place(e, sx, sy, srot, 0.01); });
      tracks.push(phased(a, b + 0.25, (t) => {
        const [tx, ty, rot] = t < a ? [sx, sy, srot] : st(t);
        place(e, tx, ty, rot, t < a ? 0.01 : 0.01 + 0.99 * seg(t, a, a + 0.18));
        showSel(sn, r, tx, ty, t < a + 0.05 ? 0 : 1 - seg(t, b, b + 0.2));
      }));
      setBeat(task.c, { t0: a, t1: b, at: (t) => { const [tx, ty] = st(t); return [r.l + 18 + tx, r.t + 12 + ty]; } });
      ripples.push({ t: b, at: () => (task.snap ? [guideX, r.cy] : [r.l + 18, r.t + 12]), color: colorOf(task.c) });
    } else if (task.k === "type2" || task.k === "type1") {
      const r = R[task.el], e = els[task.el];
      if (!r || !e) continue;
      covered.add(task.el);
      const caret = ref.caret;
      const lines = Array.from(e.querySelectorAll<HTMLElement>(".nav-item"));
      const measure = (n: Element) => { const rg = document.createRange(); rg.selectNodeContents(n); const q = rg.getBoundingClientRect(); return { l: q.left, w: q.width, t: q.top, b: q.bottom, n: Math.max(1, (n.textContent || "").trim().length) }; };
      const L = task.k === "type2" && lines.length >= 2 ? [measure(lines[0]), measure(lines[1])] : [{ l: r.l, w: r.w, t: r.t, b: r.b, n: Math.max(8, Math.round(r.w / 9)) }];
      const q = (u: number, n: number) => (u >= 1 ? 1 : Math.floor(u * n) / n);
      const edge = (t: number) => { // typed width and which line, at time t
        const u = seg(t, a, b);
        if (L.length === 1) { const w = q(E.io2(u), L[0].n); return { line: 0, w }; }
        if (u < 0.46) return { line: 0, w: q(u / 0.46, L[0].n) };
        if (u < 0.52) return { line: 0, w: 1 };
        return { line: 1, w: q((u - 0.52) / 0.48, L[1].n) };
      };
      inits.push(() => { e.setAttribute("data-zb", ""); e.style.opacity = "0.01"; e.style.clipPath = "inset(0 100% 0 0)"; });
      tracks.push(phased(a, b + 0.25, (t) => {
        sw(e, "opacity", t < a ? "0.01" : "1");
        const { line, w } = edge(t);
        let clip: string;
        if (t >= b) clip = "none";
        else if (t < a) clip = "inset(0 100% 0 0)";
        else if (L.length === 1) clip = `inset(0px ${(r.w - w * L[0].w).toFixed(1)}px 0px 0px)`;
        else if (line === 0) clip = `inset(0px ${(r.w - (L[0].l - r.l) - w * L[0].w).toFixed(1)}px ${(r.b - L[0].b).toFixed(1)}px 0px)`;
        else { const x2 = L[1].l - r.l + w * L[1].w, y1 = L[0].b - r.t; clip = `polygon(0px 0px,${r.w}px 0px,${r.w}px ${y1}px,${x2.toFixed(1)}px ${y1}px,${x2.toFixed(1)}px ${r.h}px,0px ${r.h}px)`; }
        sw(e, "clip-path", clip);
        const c = L[line] ?? L[0];
        sw(caret, "height", `${Math.max(10, c.b - c.t)}px`);
        sw(caret, "transform", `translate(${(c.l + w * c.w + 3).toFixed(1)}px,${c.t.toFixed(1)}px)`);
        sw(caret, "opacity", t < a || t > b + 0.2 ? "0" : String(Math.floor(t * 9) % 2 ? 0.35 : 1));
      }));
      setBeat(task.c, { t0: a, t1: b, beam: true, at: (t) => { const { line, w } = edge(t), c = L[line] ?? L[0]; return [c.l + w * c.w + 10, (c.t + c.b) / 2]; } });
    } else if (task.k === "pop") {
      const r = R[task.el], e = els[task.el];
      if (!r || !e) continue;
      covered.add(task.el);
      inits.push(() => { e.setAttribute("data-zb", ""); place(e, 0, 0, 0, 0.01, 0.3); });
      tracks.push(phased(a, b + 0.05, (t) => { const u = seg(t, a, b); place(e, 0, 0, 0, t < a ? 0.01 : 0.01 + 0.99 * clamp01(u * 2.6), t < a ? 0.3 : lerp(0.3, 1, E.back(u, 2.3))); }));
      setBeat(task.c, { t0: a, t1: b, at: (t) => [r.cx + 16 + Math.sin(seg(t, a, b) * 7) * 3, r.cy + 16] });
      ripples.push({ t: a + 0.08, at: () => [r.cx, r.cy], color: colorOf(task.c) });
    } else if (task.k === "wipe") {
      const r = R[task.el], e = els[task.el];
      if (!r || !e) continue;
      covered.add(task.el);
      inits.push(() => { e.setAttribute("data-zb", ""); e.style.opacity = "0.01"; e.style.clipPath = "inset(0 100% 0 0)"; });
      tracks.push(phased(a, b + 0.05, (t) => {
        const u = E.io2(seg(t, a, b));
        sw(e, "opacity", t < a ? "0.01" : "1");
        sw(e, "clip-path", u >= 1 ? "none" : `inset(0 ${((1 - u) * 100).toFixed(2)}% 0 0)`);
      }));
      setBeat(task.c, { t0: a, t1: b, at: (t) => { const u = E.io2(seg(t, a, b)); return [r.l + r.w * u, r.t + 8 + Math.sin(u * 11) * 7]; } });
    } else if (task.k === "strokes") {
      const list = FACE_STROKES.filter((s) => task.groups.includes(s.g));
      if (!list.length) continue;
      const hatch = (s: FaceStroke) => s.g !== "sil" && s.g !== "cap" && s.g !== "feat";
      const endOf = (s: FaceStroke): V2 => [s.p[s.p.length - 2], s.p[s.p.length - 1]];
      const ws = list.map((s, i) => 0.05 + s.len / (hatch(s) ? 2600 : 1500) + (i ? dist(endOf(list[i - 1]), [s.p[0], s.p[1]]) / 3200 : 0));
      const tot = ws.reduce((x, y) => x + y, 0);
      let cur = a;
      list.forEach((s, i) => {
        const sa = cur, sb = cur + ((b - a) * ws[i]) / tot;
        cur = sb;
        const d0 = sa + 0.22 * (sb - sa);
        const prev: V2 = i ? endOf(list[i - 1]) : [s.p[0], s.p[1]];
        const start = P(s.p[0], s.p[1]), from = P(prev[0], prev[1]);
        slots.push({ s, a: sa, b: sb, d0, drawn: 0 });
        setBeat(task.c, {
          t0: sa, t1: sb,
          at: (t) => {
            if (t < d0) return arc(from, start, seg(t, sa, d0), 0.12);
            const q = pointAt(s.p, s.len * E.pen(seg(t, d0, sb)));
            return P(q[0], q[1]);
          },
        });
      });
    } else if (task.k === "brim") {
      brim.a = a; brim.b = b; brim.on = true;
      const at = (t: number): V2 => { const u = E.io2(seg(t, a, b)); return P(lerp(brim.minX + 14, brim.maxX - 14, u), (brim.minY + brim.maxY) / 2 + Math.sin(u * 8) * 9); };
      setBeat(task.c, { t0: a, t1: b, at });
    }
  }
  // anything no task builds (e.g. the ghost word on a phone) comes in with the head
  const late: HTMLElement[] = [];
  (Object.keys(SEL) as Key[]).forEach((k) => { if (!covered.has(k) && els[k]) late.push(els[k]!); });
  inits.push(() => late.forEach((e) => { e.setAttribute("data-zb", ""); e.style.opacity = "0.01"; }));

  /* ---------- the finale: every cursor takes a handle of the head's frame; on the shared click the real head comes in ---------- */
  const hb = { l: 176, t: 30, r: 644, b: 694 }; // the head in the picture's own pixels
  const frameAt = (t: number) => { // the frame is dragged out a little by the five cursors, then released
    const u = E.out3(seg(t, plan.hold, plan.release));
    const k = lerp(0.9, 1, u), cx = (hb.l + hb.r) / 2, cy = (hb.t + hb.b) / 2;
    const [x0, y0] = P(cx + (hb.l - cx) * k, cy + (hb.t - cy) * k), [x1, y1] = P(cx + (hb.r - cx) * k, cy + (hb.b - cy) * k);
    return { x0, y0, x1, y1 };
  };
  const handleXY = (h: "tl" | "tr" | "br" | "bl" | "bm", t: number): V2 => {
    const f = frameAt(t);
    return h === "tl" ? [f.x0, f.y0] : h === "tr" ? [f.x1, f.y0] : h === "br" ? [f.x1, f.y1] : h === "bl" ? [f.x0, f.y1] : [(f.x0 + f.x1) / 2, f.y1];
  };
  (Object.keys(plan.handle) as CId[]).forEach((c) => {
    const h = plan.handle[c]!;
    setBeat(c, { t0: plan.hold, t1: plan.release, at: (t) => handleXY(h, t) });
    ripples.push({ t: plan.release, at: () => handleXY(h, plan.release), color: colorOf(c) });
  });
  actorList.forEach((a) => { a.beats.sort((x, y) => x.t0 - y.t0); const last = a.beats[a.beats.length - 1]; a.hold = last ? last.at(plan.release) : a.spawn; });
  const t0H = plan.hold - 0.45, TD = plan.release;
  const revealEnd = TD + 0.85;
  const blinkAt = revealEnd + 0.05;

  /* ---------- crosses ("blueprint" registration marks) ---------- */
  const marksPath = ref.marks.querySelector("path")!;
  let md = "";
  (Object.keys(R) as Key[]).forEach((k) => { const r = R[k]; if (r && k !== "ghost") md += `M${r.l - 12} ${r.t - 12}h8M${r.l - 8} ${r.t - 16}v8M${r.r + 4} ${r.b + 12}h8M${r.r + 8} ${r.b + 8}v8`; });
  marksPath.setAttribute("d", md);

  /* ---------- clock, skip, wait for the 3D head ---------- */
  let tl = 0, waited = 0, skipping = false, last = 0, raf = 0, finished = false, headOn = false, lastT = -1, pre = false, preStart = 0, readyAt = 0, framed = false, prerollMs = 0;
  const pointer: V2 = [vw * 0.5, vh * 0.7];
  const onMove = (e: PointerEvent) => { pointer[0] = e.clientX; pointer[1] = e.clientY; };
  const ready = () => S.hasAttribute("data-ready");
  const eventsDone = new Set<string>();
  const costs: number[] = [];
  const dismissLoader = () => document.getElementById("zk-loader")?.classList.add("zk-done");

  const hardStop = () => { try { finish(); } catch { /* nothing more to do */ } };
  // Two safety nets. Until the first animation frame has run (a hidden pane or background tab runs none: the build simply waits
  // until it is seen) only a long timer applies; once frames run, the build must end within its own length plus the waits.
  let watchdog = window.setTimeout(hardStop, 120000);

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(watchdog);
    removeEventListener("pointermove", onMove);
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((n) => removeEventListener(n, skip, true));
    removeEventListener("resize", skip);
    dismissLoader();  // never leave the loader up
    document.querySelectorAll<HTMLElement>("[data-zb]").forEach((e) => {
      e.removeAttribute("data-zb");
      ["opacity", "clip-path", "translate", "rotate", "scale", "transition"].forEach((p) => e.style.removeProperty(p));
    });
    S.style.removeProperty("opacity"); S.style.removeProperty("clip-path");
    root.classList.add("zb-head", "zb-done"); root.classList.remove("zb-live");
    layer.style.display = "none";
    handleObj.done = true;
  }
  function skip() {
    if (skipping || finished) return;
    skipping = true;
    waited = MAX_WAIT + 1;
    if (pre) { pre = false; dismissLoader(); }
  }

  /* ---------- one frame ---------- */
  function render(t: number, fidget: number, dt: number) {
    for (const f of tracks) f(t); // finished tracks return at once
    // sketch: draw only what is new since last frame (redraw from scratch when time jumps back)
    if (t < lastT) resetSketch();
    lastT = t;
    ctx.setTransform(dpr * fs, 0, 0, dpr * fs, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = ink; ctx.fillStyle = ink;
    for (const s of slots) {
      if (t <= s.d0) continue;
      const to = s.s.len * E.pen(seg(t, s.d0, s.b));
      if (to > s.drawn) { ctx.lineWidth = lineW[s.s.g] ?? 1.8; drawPart(ctx, s.s.p, s.drawn, to); s.drawn = to; }
    }
    if (brim.on && t > brim.a) {
      const x = lerp(brim.minX, brim.maxX, E.io2(seg(t, brim.a + 0.1 * (brim.b - brim.a), brim.b)));
      if (x > brim.done) {
        ctx.save(); ctx.beginPath(); ctx.rect(brim.done - 1, 0, x - brim.done + 2, FACE_H); ctx.clip();
        ctx.beginPath(); for (let i = 0; i < FACE_BRIM.length; i += 2) (i ? ctx.lineTo(FACE_BRIM[i], FACE_BRIM[i + 1]) : ctx.moveTo(FACE_BRIM[i], FACE_BRIM[i + 1]));
        ctx.closePath(); ctx.fill(); ctx.restore(); brim.done = x;
      }
    }
    sw(cv, "opacity", (1 - (asleep ? seg(t, TD, TD + 0.45) : seg(t, TD + 0.25, revealEnd + 0.5))).toFixed(3));
    // layer chrome
    sw(ref.grid, "opacity", (seg(t, 0, 0.45) * (1 - seg(t, TD, revealEnd))).toFixed(3));
    sw(ref.marks, "opacity", (seg(t, 0.1, 0.6) * (1 - seg(t, plan.hold, TD + 0.3))).toFixed(3));
    // head frame
    const hf = ref.headFrame, op = seg(t, t0H, t0H + 0.25) * (1 - seg(t, TD + 0.15, TD + 0.5));
    sw(hf, "opacity", op.toFixed(3));
    if (op > 0) {
      const f = frameAt(t);
      sw(hf, "transform", `translate(${f.x0.toFixed(1)}px,${f.y0.toFixed(1)}px)`);
      sw(hf, "width", `${(f.x1 - f.x0).toFixed(1)}px`); sw(hf, "height", `${(f.y1 - f.y0).toFixed(1)}px`);
      setText(headLab, fidget > 0.3 ? `3D · warming up${".".repeat(1 + (Math.floor(fidget * 3) % 3))}` : `W ${Math.round(f.x1 - f.x0)} · H ${Math.round(f.y1 - f.y0)} · 3D`);
    }
    // the real head, coming in from the top as the cursors let go
    const rv = E.io2(seg(t, TD, revealEnd));
    if (t >= TD && !headOn) { headOn = true; root.classList.add("zb-head"); }
    if (t < TD && headOn) { headOn = false; root.classList.remove("zb-head"); }
    sw(S, "opacity", t < TD ? "0.01" : "1");
    sw(S, "clip-path", t < TD ? "inset(0 0 100% 0)" : rv >= 1 ? "none" : `inset(0 0 ${Math.max(0, vh - (ft - 12 + (fh * 1.05 + 40) * rv)).toFixed(1)}px 0)`);
    for (const e of late) sw(e, "opacity", (0.01 + 0.99 * seg(t, TD, TD + 0.5)).toFixed(3));
    // ripples
    for (let i = 0; i < ripples.length; i++) {
      const rp = ripples[i], n = ref.rip[i];
      if (!n) continue;
      const u = seg(t, rp.t, rp.t + 0.55);
      if (u <= 0 || u >= 1) { sw(n, "opacity", "0"); continue; }
      const [x, y] = rp.at();
      sw(n, "opacity", (0.9 * (1 - u)).toFixed(3));
      sw(n, "transform", `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${lerp(0.3, 1.8, E.out3(u)).toFixed(2)})`);
      sw(n, "border-color", rp.color);
    }
    // cursors
    const ex = seg(t, plan.exit[0], plan.exit[1]);
    for (const a of actorList) {
      const bs = a.beats;
      let pos: V2 | null = null, beam = false;
      if (t >= a.spawnT && bs.length) {
        if (t < bs[0].t0) pos = arc(a.spawn, bs[0].at(bs[0].t0), seg(t, a.spawnT, bs[0].t0), a.bend);
        else {
          pos = bs[bs.length - 1].at(bs[bs.length - 1].t1);
          for (let i = 0; i < bs.length; i++) {
            if (t <= bs[i].t1) {
              if (t >= bs[i].t0) { pos = bs[i].at(t); beam = !!bs[i].beam; }
              else { const pv = bs[i - 1]; pos = arc(pv.at(pv.t1), bs[i].at(bs[i].t0), seg(t, pv.t1, bs[i].t0), a.bend * (i % 2 ? -1 : 1)); }
              break;
            }
          }
        }
      }
      if (!pos) { sw(a.node, "opacity", "0"); continue; }
      if (fidget > 0) { const k = a.id.charCodeAt(1); pos = [pos[0] + Math.sin(fidget * 3 + k) * 5, pos[1] + Math.cos(fidget * 2.3 + k * 2) * 4]; }
      let opacity = 1, dot = 0;
      if (ex > 0) { // arrows turn back into the site's own full stop and drift off
        const mid: V2 = a.id === "c4" ? pointer : [pos[0] < vw / 2 ? -30 : vw + 30, pos[1] < vh / 2 ? -30 : vh + 30];
        pos = arc(a.hold, mid, E.io2(ex), 0.1);
        dot = clamp01(ex * 3); opacity = 1 - seg(ex, 0.55, 1);
      }
      // tilt follows the real velocity (px per second), smoothed over time, so it looks the same at 60 and 120 Hz
      const vx = (pos[0] - a.px) / Math.max(dt, 1 / 240);
      a.tilt += (Math.max(-14, Math.min(14, vx * 0.004)) - a.tilt) * (1 - Math.exp(-dt / 0.07));
      a.px = pos[0]; a.py = pos[1];
      sw(a.node, "opacity", opacity.toFixed(3));
      sw(a.node, "transform", `translate(${pos[0].toFixed(1)}px,${pos[1].toFixed(1)}px)`);
      const pose = dot > 0.5 ? "dot" : beam ? "beam" : "arrow";
      if (a.node.getAttribute("data-pose") !== pose) a.node.setAttribute("data-pose", pose);
      sw(a.glyph, "transform", `rotate(${(-a.tilt * 0.6).toFixed(1)}deg)`);
      sw(a.chip, "opacity", (1 - dot).toFixed(2));
    }
    // the avatar's own hello, once the head is in
    if (t >= blinkAt && !eventsDone.has("hi")) {
      eventsDone.add("hi");
      if (asleep) return; // the sleeper keeps his own ZZZ and "shh" lines
      window.dispatchEvent(new Event("zk-nod"));
      window.dispatchEvent(new CustomEvent("zk-say", { detail: { text: "HEY THERE!", ms: 2200 } }));
    }
  }

  /* ---------- run ---------- */
  inits.forEach((f) => f());
  sw(layer, "opacity", "1");
  layer.style.display = "";
  resetSketch();
  root.classList.add("zb-live");
  addEventListener("pointermove", onMove, { passive: true });
  const frame = (now: number) => {
    if (finished) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    const gapMs = now - last;
    last = now;
    if (!framed) { framed = true; window.clearTimeout(watchdog); watchdog = window.setTimeout(hardStop, (plan.end + MAX_WAIT + PREROLL_MAX + 4) * 1000); }
    try {
      if (pre) {
        // Pre-roll: the 3D head is building behind the loader. Wait for it (plus a short settle), but never longer than the cap.
        if (!preStart) preStart = now;
        if (ready() && !readyAt) readyAt = now;
        if ((readyAt && now - readyAt > SETTLE_MS) || now - preStart > PREROLL_MAX * 1000) {
          pre = false; prerollMs = now - preStart; dismissLoader();
        } else { raf = requestAnimationFrame(frame); return; }
      }
      const holding = tl >= plan.hold && !ready() && waited < MAX_WAIT;
      if (holding) { waited += dt; tl = plan.hold; }
      else if (skipping) tl += dt * 9;
      else tl += dt * speed;
      const c0 = performance.now();
      render(tl, holding ? waited : 0, dt);
      if (costs.length < 4000) costs.push(performance.now() - c0);
      if (tl >= plan.end || (skipping && tl >= plan.end - 0.4)) { render(plan.end, 0, dt); finish(); return; }
    } catch (err) {
      console.error("build prototype failed, showing the page as it is", err);
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  const handleObj: BuildHandle = {
    duration: plan.end, done: false,
    seek: (t: number) => { skipping = false; render(Math.max(0, Math.min(plan.end, t)), 0, 1 / 60); },
    skip,
    destroy: () => { finish(); },
    stats: () => { const s = [...costs].sort((x, y) => x - y); const n = s.length; return { frames: n, mean: n ? s.reduce((x, y) => x + y, 0) / n : 0, p95: n ? s[Math.floor(n * 0.95)] : 0, max: n ? s[n - 1] : 0, preroll: prerollMs }; },
  };
  if (opts.seek !== undefined) {
    render(Math.max(0, Math.min(plan.end, opts.seek)), 0, 1 / 60);
  } else {
    addEventListener("pointerdown", skip, { capture: true, passive: true });
    addEventListener("keydown", skip, { capture: true, passive: true });
    addEventListener("wheel", skip, { capture: true, passive: true });
    addEventListener("touchstart", skip, { capture: true, passive: true });
    addEventListener("resize", skip);
    render(0, 0, 1 / 60);
    pre = !ready(); // with the head already built (a replay) there is nothing to wait for
    last = performance.now();
    raf = requestAnimationFrame(frame);
    if (!pre) dismissLoader();
  }
  return handleObj;
}
