import type { Portrait, Pt } from "@/lib/portrait/strokes";
import {
  CARD_W, CARD_H, FRAME_SRC, captionLines, makeSrc, paintMark, paintPaper, paintPart, paintText, paintTicks, pointAt, portraitSrcs, textEndX, toCard,
  type CapLine, type Src,
} from "@/lib/portrait/card";

/* Five cursors draw the portrait. A deterministic timeline, like components/homebuild/director.ts: the picture at time t is a pure
   function of t, drawn incrementally while time moves forward (and redrawn from zero if it is ever sent backwards), so a frozen
   frame (?t= in tests), the 9x skip and the normal run all look the same.

   Roles (the names on the cursors are real tools of this site):
     Next.js    layout   the card's frame and the construction lines, then the lower half of the shading
     Three.js   3D       the jaw and the nose
     TypeScript type     the neck and shoulders, then types the caption
     CSS        style    brows, eyes, irises, lips
     React      shading  the upper half of the shading
   Everything is drawn on one 1080 x 1350 canvas which IS the shareable card (lib/portrait/card.ts), and on a second canvas of
   construction lines that fades away at the end. */

export type CursorId = "c1" | "c2" | "c3" | "c4" | "c5";
export interface DrawOpts {
  canvas: HTMLCanvasElement;       // 1080 x 1350, the card
  guides: HTMLCanvasElement;       // same size, construction lines
  stage: HTMLElement;              // the box the canvases are shown in (cursors are placed in its pixels)
  cursors: Record<CursorId, HTMLElement>;
  portrait: Portrait;
  name: string;
  lite: boolean;
  seek?: number;                   // freeze at this second (tests)
  speed?: number;
  onDone: () => void;
}
export interface DrawHandle { duration: number; done: boolean; seek: (t: number) => void; skip: () => void; destroy: () => void; time: () => number }

interface Seg {
  k: "move" | "draw" | "type";
  t0: number; t1: number; a: Pt; b: Pt;
  src?: Src; layer?: "g";
  line?: number; count?: number;   // type: which caption line, how many letters
  after?: "ticks" | "mark";
  done: number;                    // fraction (draw) or letters (type) already inked
  ended?: boolean;
}
interface Track { id: CursorId; enter: number; home: Pt; segs: Seg[]; idx: number; last: Pt }

const END = 7.8, FADE = 8.35, DURATION = 8.5;
const ease = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u));
const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);

export function startDraw(o: DrawOpts): DrawHandle {
  const g = o.canvas.getContext("2d")!;
  const gg = o.guides.getContext("2d")!;
  const lite = o.lite, K = lite ? 0.72 : 1;
  const lines = captionLines(o.name);
  const srcs = portraitSrcs(o.portrait);
  const by = (...groups: string[]) => srcs.filter((_, i) => groups.includes(o.portrait.strokes[i].g));
  const eyeY = toCard(0, o.portrait.eyeY)[1];

  // ---- the plan ----
  const layout = (list: Src[], w0: number, w1: number, from: Pt, extra?: Partial<Seg>): { segs: Seg[]; end: Pt } => {
    const V = 1500;
    let prev = from, raw = 0;
    const parts = list.map((s) => {
      const a: Pt = [s.pts[0], s.pts[1]], b: Pt = [s.pts[s.pts.length - 2], s.pts[s.pts.length - 1]];
      const mv = 0.04 + Math.hypot(a[0] - prev[0], a[1] - prev[1]) / 4500, dr = Math.max(0.05, s.len / V);
      raw += mv + dr; prev = b;
      return { s, a, b, mv, dr };
    });
    const k = raw > 0 ? (w1 - w0) / raw : 1;
    const segs: Seg[] = [];
    let t = w0; prev = from;
    for (const p of parts) {
      segs.push({ k: "move", t0: t, t1: t + p.mv * k, a: prev, b: p.a, done: 0 }); t += p.mv * k;
      segs.push({ k: "draw", t0: t, t1: t + p.dr * k, a: p.a, b: p.b, src: p.s, done: 0, ...extra }); t += p.dr * k;
      prev = p.b;
    }
    return { segs, end: prev };
  };
  const approach = (from: Pt, to: Pt, tEnd: number, tFloor: number): Seg => ({ k: "move", t0: Math.max(tFloor, tEnd - 0.55), t1: tEnd, a: from, b: to, done: 0 });

  const mk = (id: CursorId, enter: number, home: Pt): Track => ({ id, enter, home, segs: [], idx: 0, last: home });
  const add = (tr: Track, w0: number, w1: number, list: Src[], extra?: Partial<Seg>, withFinal?: Seg["after"]) => {
    if (!list.length) return;
    const t0 = w0 * K, t1 = w1 * K;
    const first: Pt = [list[0].pts[0], list[0].pts[1]];
    const prevEnd = tr.segs.length ? tr.segs[tr.segs.length - 1].t1 : tr.enter * K;
    const from = tr.segs.length ? tr.segs[tr.segs.length - 1].b : tr.home;
    tr.segs.push(approach(from, first, t0, prevEnd));
    const r = layout(list, t0, t1, first, extra);
    tr.segs.push(...r.segs);
    if (withFinal) r.segs[r.segs.length - 1].after = withFinal;
  };

  const c1 = mk("c1", 0.0, [-70, -50]), c2 = mk("c2", 2.1, [CARD_W + 90, 420]), c3 = mk("c3", 0.7, [-80, CARD_H + 40]);
  const c4 = mk("c4", 0.25, [CARD_W + 70, -60]), c5 = mk("c5", 1.6, [CARD_W + 60, CARD_H + 60]);

  // Next.js: the frame, then two construction lines, then the lower half of the shading
  add(c1, 0.4, 1.6, [FRAME_SRC], undefined, "ticks");
  const centreLine = makeSrc([CARD_W / 2, 60, CARD_W / 2, 1130], 1.3), eyeLine = makeSrc([110, eyeY, CARD_W - 110, eyeY], 1.3);
  add(c1, 1.7, 2.3, [centreLine], { layer: "g" });
  add(c1, 2.3, 2.9, [eyeLine], { layer: "g" });
  add(c1, 3.0, 7.2, by("hatchB"));
  // Three.js: the jaw, then the nose
  add(c4, 0.95, 2.3, by("oval"));
  add(c4, 2.4, 3.4, by("nose"));
  // TypeScript: neck and shoulders, then the caption
  add(c3, 1.3, 3.6, by("neck"));
  // CSS: brows, eyes (with irises), lips
  add(c5, 2.4, 3.5, by("brow"));
  add(c5, 3.5, 4.6, by("eye", "iris"));
  add(c5, 4.6, 5.5, by("lips"));
  // React: the upper half of the shading
  add(c2, 3.0, 7.2, by("hatchA"));
  // the caption: three typed lines, one continuous pass
  {
    const t0 = 6.2 * K, t1 = 7.7 * K, weights = [0.55, 0.3, 0.15];
    const startAt = (i: number): Pt => [lines[i].x, lines[i].y - 14];
    const prevEnd = c3.segs.length ? c3.segs[c3.segs.length - 1].t1 : 0;
    c3.segs.push(approach(c3.segs.length ? c3.segs[c3.segs.length - 1].b : c3.home, startAt(0), t0, prevEnd));
    let t = t0;
    lines.forEach((l, i) => {
      const dt = (t1 - t0) * weights[i];
      c3.segs.push({ k: "type", t0: t, t1: t + dt, a: startAt(i), b: [textEndX(g, l, l.text.length), l.y - 14], line: i, count: l.text.length, done: 0, after: i === lines.length - 1 ? "mark" : undefined });
      t += dt;
    });
  }
  const tracks = [c1, c2, c3, c4, c5];
  tracks.forEach((tr) => { tr.last = tr.home; });

  // ---- drawing ----
  const sx = () => o.stage.clientWidth / CARD_W;
  let S = sx();
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { S = sx(); }) : null;
  ro?.observe(o.stage);

  const inkSeg = (s: Seg, f: number) => {
    if (!s.src) return;
    const ctx = s.layer === "g" ? gg : g;
    if (f > s.done) { paintPart(ctx, s.src, s.done, f, s.layer === "g" ? "rgba(22,22,22,0.55)" : undefined); s.done = f; }
  };
  const typeSeg = (s: Seg, f: number) => {
    const n = Math.min(s.count!, Math.floor(f * s.count! + 1e-6));
    if (n > s.done) { paintText(g, lines[s.line!], s.done, n); s.done = n; }
  };
  const finish = (s: Seg) => {
    if (s.ended) return;
    s.ended = true;
    if (s.k === "draw") inkSeg(s, 1); else if (s.k === "type") typeSeg(s, 1);
    if (s.after === "ticks") paintTicks(g); else if (s.after === "mark") paintMark(g);
  };

  const reset = () => {
    g.clearRect(0, 0, CARD_W, CARD_H); gg.clearRect(0, 0, CARD_W, CARD_H);
    paintPaper(g);
    tracks.forEach((tr) => { tr.idx = 0; tr.last = tr.home; tr.segs.forEach((s) => { s.done = 0; s.ended = false; }); });
  };

  // only write a style when it changed
  const last = new Map<HTMLElement, { tr: string; op: string }>();
  const place = (el: HTMLElement, tr: string, op: string) => {
    let p = last.get(el);
    if (!p) { p = { tr: "", op: "" }; last.set(el, p); }
    if (p.tr !== tr) { p.tr = tr; el.style.transform = tr; }
    if (p.op !== op) { p.op = op; el.style.opacity = op; }
  };

  let lastT = -1;
  const render = (t: number) => {
    if (t < lastT - 1e-6) reset();
    lastT = t;
    const fadeStart = END * K;
    const sceneFade = clamp01((t - fadeStart) / ((FADE - END) * K));
    for (const tr of tracks) {
      while (tr.idx < tr.segs.length && tr.segs[tr.idx].t1 <= t) { const s = tr.segs[tr.idx]; finish(s); tr.last = s.b; tr.idx++; }
      const s = tr.segs[tr.idx];
      let pos = tr.last, pose = "arrow";
      if (s && t >= s.t0) {
        const u = (t - s.t0) / Math.max(1e-6, s.t1 - s.t0);
        if (s.k === "move") { const e = ease(u); pos = [s.a[0] + (s.b[0] - s.a[0]) * e, s.a[1] + (s.b[1] - s.a[1]) * e]; }
        else if (s.k === "draw" && s.src) { inkSeg(s, u); pos = pointAt(s.src, u); }
        else if (s.k === "type") { typeSeg(s, u); pos = [textEndX(g, lines[s.line!], s.done), s.b[1]]; pose = "beam"; }
      }
      if (t >= fadeStart) pose = "dot";
      const el = o.cursors[tr.id];
      const vis = clamp01((t - tr.enter * K) / 0.25) * (1 - sceneFade);
      el.dataset.pose = pose;
      place(el, `translate3d(${(pos[0] * S).toFixed(1)}px,${(pos[1] * S).toFixed(1)}px,0)`, vis.toFixed(3));
    }
    // the construction lines fade as the cursors leave
    o.guides.style.opacity = String(1 - clamp01((t - 7.0 * K) / (0.8 * K)));
  };

  // ---- the clock ----
  let t = 0, raf = 0, prevNow = 0, speed = o.speed ?? 1, destroyed = false;
  const h: DrawHandle = {
    duration: DURATION * K, done: false,
    seek: (to) => { t = Math.max(0, Math.min(to, h.duration)); render(t); },
    skip: () => { speed = 9; },
    destroy: () => { destroyed = true; cancelAnimationFrame(raf); ro?.disconnect(); },
    time: () => t,
  };
  reset();
  render(0);
  if (o.seek !== undefined && Number.isFinite(o.seek)) {
    h.seek(o.seek);
    return h;
  }
  const frame = (now: number) => {
    if (destroyed) return;
    const dt = prevNow ? Math.min(0.1, (now - prevNow) / 1000) : 0;
    prevNow = now;
    t += dt * speed;
    if (t >= h.duration) {
      t = h.duration; render(t);
      if (!h.done) { h.done = true; o.onDone(); }
      return;
    }
    render(t);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return h;
}
