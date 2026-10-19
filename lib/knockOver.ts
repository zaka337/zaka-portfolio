/* "Whatever." Click the title on the home page and it falls apart.

   Every letter of the title becomes a loose object: it is lifted off the page, trembles,
   then drops under gravity and bounces off the screen edges, off the other letters and off
   the avatar's head. Letters can be grabbed and thrown. A click anywhere (or Escape, or
   fourteen quiet seconds) sends them flying back to exactly where they were.

   How it works, so it stays cheap and safe:
   - The real title is never touched, moved or removed (React owns it). Each letter is
     measured, a clone is laid over it, and the original is only hidden with
     [data-egg] { visibility: hidden } until the letters are home again.
   - The physics is a small fixed-step simulation of circles (240 Hz steps, so it behaves
     the same at 60 and 120 Hz). Rendering is one transform per letter per frame.
   - It runs only while the effect is active and removes everything it added when done. */

type Hooks = {
  /** Make the avatar say something in its speech bubble. */
  say: (text: string, ms?: number) => void;
  /** Make the avatar nod. */
  nod: () => void;
};

interface Body {
  el: HTMLSpanElement;
  hx: number; hy: number; // home centre (viewport px): where the letter belongs
  x: number; y: number;   // current centre
  vx: number; vy: number;
  a: number; w: number;   // angle and angular velocity (radians)
  r: number; m: number;   // radius (letter-to-letter and head contacts) and mass
  hw: number; hh: number; // half width/height of the glyph box (floor and wall contacts)
  inertia: number;
  held: boolean;
  gx: number; gy: number; // while held: where the pointer wants the centre to be
  ox: number; oy: number; // while held: pointer offset from the centre when it was grabbed
  tw: { t0: number; dur: number; x0: number; y0: number; a0: number; a1: number } | null;
}

interface Controller {
  stop: () => void;
}

let active: Controller | null = null;

const STEP = 1 / 240;         // physics step (s)
const SHAKE_MS = 380;         // trembling before the letters let go
const RETURN_MS = 720;        // flight home
const RETURN_STAGGER_MS = 14; // delay between letters on the way home
const IDLE_MS = 14000;        // quiet time before they go home on their own
const IGNORE_RETURN_MS = 700; // the click that started it must not also end it

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOutBack = (t: number) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

let measureCtx: CanvasRenderingContext2D | null = null;

/* One record per visible character: where it is, how big it is, how to draw it. */
function gather(source: HTMLElement) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  const glyphs: {
    ch: string; left: number; top: number; width: number; height: number;
    cx: number; cy: number; r: number; hw: number; hh: number; size: number;
    family: string; weight: string; spacing: string; shadow: string; tone: string;
  }[] = [];
  if (!ctx) return glyphs;

  const range = document.createRange();
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    // Skip controls inside the block (the visually hidden keyboard button): only the
    // title's own text falls.
    if (!parent || parent.closest("button")) continue;
    const cs = getComputedStyle(parent);
    if (cs.display === "none" || cs.visibility === "hidden") continue;

    const size = parseFloat(cs.fontSize);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    // The label is dim; the title uses the full ink (not the hover-dimmed colour it may have right now).
    const tone = parent.classList.contains("label") ? "var(--ink-50)" : "var(--ink)";

    const text = node.nodeValue ?? "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (/\s/.test(ch)) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rc = range.getClientRects()[0];
      if (!rc || rc.width < 1 || rc.height < 1) continue;

      const m = ctx.measureText(ch);
      const fontAscent = m.fontBoundingBoxAscent ?? size * 0.93;
      const asc = m.actualBoundingBoxAscent;
      const desc = m.actualBoundingBoxDescent;
      // The rectangle is the font's content area: its top is the ascent above the baseline.
      const baseline = rc.top + fontAscent;
      const cx = rc.left + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
      const cy = baseline + (desc - asc) / 2;
      const glyphH = asc + desc;
      const glyphW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      // Letters push each other as circles of the same area; the floor and walls use the
      // real (rotating) box, so letters can lie flat instead of sinking in.
      const hw = Math.max(glyphW / 2, 0.05 * size);
      const hh = Math.max(glyphH / 2, 0.05 * size);
      const r = Math.max(Math.sqrt(hw * hh) * 1.02, 0.1 * size);

      glyphs.push({
        ch, left: rc.left, top: rc.top, width: rc.width, height: rc.height, cx, cy, r, hw, hh, size,
        family: cs.fontFamily, weight: cs.fontWeight, spacing: cs.letterSpacing,
        shadow: cs.textShadow, tone,
      });
    }
  }
  return glyphs;
}

/* The avatar's head, as a capsule (a vertical line with a radius), from the layout the 3D
   scene publishes. null when it is not available. */
function headCollider(W: number) {
  const scene = document.querySelector<HTMLElement>(".avatar-scene");
  if (!scene) return null;
  const cs = getComputedStyle(scene);
  const cy = parseFloat(cs.getPropertyValue("--face-cy"));
  const px = parseFloat(cs.getPropertyValue("--face-px"));
  if (!isFinite(cy) || !isFinite(px) || px <= 0) return null;
  const rect = scene.getBoundingClientRect();
  const y = rect.top + (cy / 100) * rect.height;
  return { x: W / 2, y1: y - 0.16 * px, y2: y + 0.16 * px, r: 0.35 * px };
}

export function stopKnockOver() {
  active?.stop();
}

/** Returns false if nothing happened (already running, reduced motion, no text found). */
export function knockOver(source: HTMLElement, hooks: Hooks): boolean {
  if (active) return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    hooks.say("WHATEVER.");
    return true;
  }

  const glyphs = gather(source);
  if (!glyphs.length) return false;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const g = 2.6 * H;           // gravity, px/s^2 (scales with the screen)
  const floor = H - 1;
  const head = headCollider(W);
  let firstHit = false;

  /* ── Build the overlay: one clone per letter, laid exactly over the original ── */
  const layer = document.createElement("div");
  layer.className = "egg-layer";
  layer.setAttribute("aria-hidden", "true");

  const bodies: Body[] = glyphs.map((gl) => {
    const el = document.createElement("span");
    el.className = "egg-letter";
    el.textContent = gl.ch;
    el.style.cssText =
      `left:${gl.left}px;top:${gl.top}px;width:${gl.width}px;height:${gl.height}px;` +
      `font-family:${gl.family};font-weight:${gl.weight};font-size:${gl.size}px;` +
      `letter-spacing:${gl.spacing};line-height:${gl.height}px;color:${gl.tone};` +
      `text-shadow:${gl.shadow};transform-origin:${gl.cx - gl.left}px ${gl.cy - gl.top}px;`;
    layer.appendChild(el);
    return {
      el, hx: gl.cx, hy: gl.cy, x: gl.cx, y: gl.cy, vx: 0, vy: 0, a: 0, w: 0,
      r: gl.r, m: gl.hw * gl.hh, hw: gl.hw, hh: gl.hh,
      inertia: (gl.hw * gl.hh * (gl.hw * gl.hw + gl.hh * gl.hh)) / 3,
      held: false, gx: 0, gy: 0, ox: 0, oy: 0, tw: null,
    };
  });
  const byEl = new Map<Element, Body>(bodies.map((b) => [b.el, b]));

  const hint = document.createElement("p");
  hint.className = "egg-hint";
  hint.setAttribute("role", "status");
  hint.textContent = "Click anywhere to put it back, or throw the letters around";

  document.body.appendChild(layer);
  document.body.appendChild(hint);
  source.setAttribute("data-egg", "");

  /* ── State ── */
  type Phase = "shake" | "fall" | "return";
  let phase: Phase = "shake";
  let raf = 0;
  let t0 = 0;       // when the effect started
  let last = 0;     // previous frame time
  let acc = 0;      // physics time owed
  let touched = 0;  // last time the visitor touched a letter
  let returnAt = 0; // when the flight home began
  let finished = false;

  const render = (jitter: number) => {
    for (const b of bodies) {
      const jx = jitter ? (Math.random() - 0.5) * jitter : 0;
      const jy = jitter ? (Math.random() - 0.5) * jitter : 0;
      const ja = jitter ? (Math.random() - 0.5) * jitter * 0.012 : 0;
      b.el.style.transform = `translate3d(${b.x - b.hx + jx}px,${b.y - b.hy + jy}px,0) rotate(${b.a + ja}rad)`;
    }
  };

  const release = () => {
    for (const b of bodies) {
      b.vx = W * rand(0.04, 0.5) * (Math.random() < 0.2 ? -1 : 1);
      b.vy = -H * rand(0.3, 0.9);
      b.w = rand(-8, 8);
    }
    hooks.say("WHATEVER.", 2200);
  };

  /* ── Physics ── */
  const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  /* A letter's box against a straight edge. (nx, ny) points into the playfield and the edge
     passes through the line n . p = offset (for the floor, the y value; for a wall, x or -x).
     Every corner past the edge gets an impulse with friction at that corner, so the letter
     picks up spin and settles on its side. */
  const boxContact = (b: Body, nx: number, ny: number, edge: number, e0: number, isFloor: boolean) => {
    const c = Math.cos(b.a), s = Math.sin(b.a);
    let deepest = 0;
    const hits: { rx: number; ry: number; d: number }[] = [];
    for (const [sx, sy] of CORNERS) {
      const lx = sx * b.hw, ly = sy * b.hh;
      const rx = lx * c - ly * s, ry = lx * s + ly * c;
      const px = b.x + rx, py = b.y + ry;
      // distance inside the playfield (negative = past the edge)
      const d = isFloor ? edge - py : nx > 0 ? px - edge : edge - px;
      if (d < 0) { hits.push({ rx, ry, d }); if (d < deepest) deepest = d; }
    }
    if (!hits.length) return;
    b.x += nx * -deepest;
    b.y += ny * -deepest;
    for (const { rx, ry } of hits) {
      const vcx = b.vx - b.w * ry, vcy = b.vy + b.w * rx;
      const vn = vcx * nx + vcy * ny;
      if (vn >= 0) continue;
      const rn = rx * ny - ry * nx;
      const e = -vn > H * 0.08 ? e0 : 0;
      const jn = (-(1 + e) * vn) / (1 / b.m + (rn * rn) / b.inertia);
      b.vx += (jn * nx) / b.m; b.vy += (jn * ny) / b.m; b.w += (rn * jn) / b.inertia;
      // friction along the edge
      const tx = -ny, ty = nx;
      const vt = (b.vx - b.w * ry) * tx + (b.vy + b.w * rx) * ty;
      const rt = rx * ty - ry * tx;
      let jt = -vt / (1 / b.m + (rt * rt) / b.inertia);
      const lim = 0.5 * jn;
      jt = Math.max(-lim, Math.min(lim, jt));
      b.vx += (jt * tx) / b.m; b.vy += (jt * ty) / b.m; b.w += (rt * jt) / b.inertia;
    }
  };

  const step = (dt: number) => {
    for (const b of bodies) {
      if (b.tw) continue;
      if (b.held) {
        // Kinematic: chase the pointer. The chasing speed becomes the throw when released.
        b.vx = Math.max(-5000, Math.min(5000, (b.gx - b.x) * 22));
        b.vy = Math.max(-5000, Math.min(5000, (b.gy - b.y) * 22));
        b.w *= 0.9;
      } else {
        b.vy += g * dt;
        b.vx *= 1 - 0.04 * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.w * dt;

      if (b.held) continue;

      // Screen edges: the glyph's box, so letters tumble onto their sides and lie flat
      b.w *= 1 - 0.25 * dt;
      boxContact(b, 0, -1, floor, 0.32, true);
      boxContact(b, 1, 0, 0, 0.45, false);
      boxContact(b, -1, 0, W, 0.45, false);
      // Come to rest instead of jittering
      if (b.y + Math.max(b.hw, b.hh) * 1.5 > floor && Math.abs(b.vx) < 9 && Math.abs(b.vy) < 14 && Math.abs(b.w) < 0.5) {
        b.vx = 0; b.vy = 0; b.w = 0;
      }

      // The avatar's head (a capsule)
      if (head) {
        const py = Math.max(head.y1, Math.min(head.y2, b.y));
        const dx = b.x - head.x, dy = b.y - py;
        const min = head.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 0.0001;
          const nx = dx / d, ny = dy / d;
          b.x = head.x + nx * min;
          b.y = py + ny * min;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= (1 + 0.55) * vn * nx;
            b.vy -= (1 + 0.55) * vn * ny;
            b.w += (b.vx * ny - b.vy * nx) / b.r * 0.15 + rand(-3, 3);
            if (!firstHit && -vn > H * 0.3) {
              firstHit = true;
              hooks.say("OW!", 1400);
              hooks.nod();
            }
          }
        }
      }
    }

    // Letters against letters
    for (let i = 0; i < bodies.length; i++) {
      const p = bodies[i];
      if (p.tw) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const q = bodies[j];
        if (q.tw || (p.held && q.held)) continue;
        const dx = q.x - p.x, dy = q.y - p.y;
        const min = p.r + q.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.0001;
        const nx = dx / d, ny = dy / d;
        const overlap = min - d;
        const ip = p.held ? 0 : 1 / p.m;
        const iq = q.held ? 0 : 1 / q.m;
        const sum = ip + iq;
        p.x -= nx * overlap * (ip / sum);
        p.y -= ny * overlap * (ip / sum);
        q.x += nx * overlap * (iq / sum);
        q.y += ny * overlap * (iq / sum);
        const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (vn < 0) {
          const jn = (-(1 + 0.22) * vn) / sum;
          p.vx -= jn * nx * ip; p.vy -= jn * ny * ip;
          q.vx += jn * nx * iq; q.vy += jn * ny * iq;
          p.w += rand(-1, 1) * Math.min(6, -vn / 400);
          q.w += rand(-1, 1) * Math.min(6, -vn / 400);
        }
      }
    }
  };

  /* ── Frame loop ── */
  const startReturn = (now: number) => {
    if (phase === "return") return;
    phase = "return";
    returnAt = now;
    hint.classList.remove("is-on");
    bodies.forEach((b, i) => {
      b.held = false;
      const turns = Math.round(b.a / (Math.PI * 2));
      b.tw = {
        t0: now + i * RETURN_STAGGER_MS, dur: RETURN_MS,
        x0: b.x, y0: b.y, a0: b.a, a1: turns * Math.PI * 2,
      };
    });
  };

  const frame = (now: number) => {
    raf = 0;
    if (finished) return;
    if (!t0) { t0 = now; last = now; touched = now; }
    const dtReal = Math.min(0.04, (now - last) / 1000);
    last = now;

    if (phase === "shake") {
      const k = Math.min(1, (now - t0) / SHAKE_MS);
      render(1 + 3.5 * k);
      if (now - t0 >= SHAKE_MS) { phase = "fall"; release(); acc = 0; }
    } else if (phase === "fall") {
      acc += dtReal;
      while (acc >= STEP) { step(STEP); acc -= STEP; }
      render(0);
      if (now - t0 > SHAKE_MS + 1100) hint.classList.add("is-on");
      if (now - touched > IDLE_MS && !bodies.some((b) => b.held)) startReturn(now);
    } else {
      let done = true;
      for (const b of bodies) {
        const tw = b.tw;
        if (!tw) continue;
        const t = (now - tw.t0) / tw.dur;
        if (t < 1) done = false;
        const e = t <= 0 ? 0 : t >= 1 ? 1 : easeOutBack(t);
        b.x = tw.x0 + (b.hx - tw.x0) * e;
        b.y = tw.y0 + (b.hy - tw.y0) * e;
        b.a = tw.a0 + (tw.a1 - tw.a0) * e;
      }
      render(0);
      if (done && now - returnAt > RETURN_MS) { finish(); return; }
    }
    raf = requestAnimationFrame(frame);
  };

  /* ── Input ── */
  const onLayerDown = (e: PointerEvent) => {
    const el = (e.target as Element | null)?.closest(".egg-letter");
    const b = el && byEl.get(el);
    if (!b || phase !== "fall") return;
    e.preventDefault();
    b.held = true;
    b.ox = e.clientX - b.x;
    b.oy = e.clientY - b.y;
    b.gx = e.clientX - b.ox;
    b.gy = e.clientY - b.oy;
    touched = performance.now();
    try { b.el.setPointerCapture(e.pointerId); } catch { /* not capturable: window listeners below still work */ }
  };
  const onMove = (e: PointerEvent) => {
    for (const b of bodies) {
      if (b.held) { b.gx = e.clientX - b.ox; b.gy = e.clientY - b.oy; touched = performance.now(); }
    }
  };
  const onUp = () => {
    for (const b of bodies) if (b.held) b.held = false;
    touched = performance.now();
  };
  const onDocDown = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest(".egg-letter")) return;
    if (performance.now() - t0 < IGNORE_RETURN_MS) return;
    startReturn(performance.now());
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") startReturn(performance.now());
  };
  const onHide = () => { if (document.hidden) finish(); };
  const onResize = () => finish(); // the measurements no longer match the screen

  function finish() {
    if (finished) return;
    finished = true;
    if (raf) cancelAnimationFrame(raf);
    layer.removeEventListener("pointerdown", onLayerDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.removeEventListener("pointerdown", onDocDown, true);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("resize", onResize);
    layer.remove();
    hint.remove();
    source.removeAttribute("data-egg");
    if (active === controller) active = null;
  }

  const controller: Controller = { stop: finish };
  active = controller;

  layer.addEventListener("pointerdown", onLayerDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.addEventListener("pointerdown", onDocDown, true);
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("resize", onResize);

  render(0);
  raf = requestAnimationFrame(frame);
  return true;
}
