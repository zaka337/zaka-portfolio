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
  wait: number;           // ms before this letter lets go (a whole page crumbles from the bottom up)
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

/* Things in a page that must not fall: the avatar and its bubble, what this effect adds
   itself, the terminal, the outline word behind the face, and text nobody reads. */
const PAGE_SKIP = "[aria-hidden='true'], .avatar-scene, .home-ghost, .egg-layer, .egg-hint, .egg-tilt, .egg-key, .zt-backdrop, .theme-toggle, script, style, noscript, textarea, input, select, svg";
const MAX_PAGE_GLYPHS = 240; // a busy page keeps 60fps: the biggest letters fall, the rest just vanish

/* One record per visible character: where it is, how big it is, how to draw it.
   page: take every readable letter on screen (the terminal's "rm -rf /"), with its own
   colour, instead of only the title's. */
function gather(source: HTMLElement, page = false) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  const glyphs: {
    ch: string; left: number; top: number; width: number; height: number;
    cx: number; cy: number; r: number; hw: number; hh: number; size: number;
    family: string; weight: string; spacing: string; shadow: string; tone: string;
  }[] = [];
  // Without a canvas (a phone can refuse one) the letters are measured from their boxes alone.

  const range = document.createRange();
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (!parent) continue;
    // Title only: skip controls inside the block (the visually hidden keyboard button), so
    // only the title's own text falls. A whole page keeps its buttons' text, minus the skips.
    if (page ? parent.closest(PAGE_SKIP) : parent.closest("button")) continue;
    const cs = getComputedStyle(parent);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (page) {
      // Text that is invisible right now (opacity 0, a hidden ancestor, a transparent colour) stays put
      const seen = (parent as HTMLElement & { checkVisibility?: (o: object) => boolean })
        .checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true });
      if (seen === false || /^(transparent|rgba\(\d+, \d+, \d+, 0\))$/.test(cs.color)) continue;
    }

    const size = parseFloat(cs.fontSize);
    if (ctx) ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    // The label is dim; the title uses the full ink (not the hover-dimmed colour it may have right now).
    // On a whole page every text keeps the colour it has.
    const tone = page ? cs.color : parent.classList.contains("label") ? "var(--ink-50)" : "var(--ink)";
    const upper = cs.textTransform === "uppercase", lower = cs.textTransform === "lowercase";

    const text = node.nodeValue ?? "";
    for (let i = 0; i < text.length; i++) {
      const raw = text[i];
      if (/\s/.test(raw)) continue;
      const ch = upper ? raw.toUpperCase() : lower ? raw.toLowerCase() : raw; // text-transform shows only on the original
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rc = range.getClientRects()[0];
      if (!rc || rc.width < 1 || rc.height < 1) continue;
      if (page && (rc.bottom < 0 || rc.top > window.innerHeight || rc.right < 0 || rc.left > window.innerWidth)) continue;

      const m = ctx ? ctx.measureText(ch) : null;
      const fontAscent = m && m.fontBoundingBoxAscent > 0 ? m.fontBoundingBoxAscent : size * 0.93;
      const asc = m && m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : size * 0.72;
      const desc = m ? m.actualBoundingBoxDescent || 0 : 0;
      const bl = m ? m.actualBoundingBoxLeft || 0 : 0;
      const br = m && m.actualBoundingBoxRight > 0 ? m.actualBoundingBoxRight : rc.width * 0.9;
      // The rectangle is the font's content area: its top is the ascent above the baseline.
      const baseline = rc.top + fontAscent;
      const cx = rc.left + (br - bl) / 2;
      const cy = baseline + (desc - asc) / 2;
      const glyphH = asc + desc;
      const glyphW = bl + br;
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
  if (page && glyphs.length > MAX_PAGE_GLYPHS) {
    glyphs.sort((a, b) => b.size - a.size);
    glyphs.length = MAX_PAGE_GLYPHS;
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

/** Returns false if nothing happened (already running, no text found).
    options.page: every readable letter in `source` falls (the terminal's `rm -rf /`),
    crumbling from the bottom up, and a click anywhere "runs git restore .". */
export function knockOver(source: HTMLElement, hooks: Hooks, options: { page?: boolean } = {}): boolean {
  if (active) return false;
  const page = !!options.page;

  /* Reduced motion (a device setting) gets a calm version instead of none: the letters
     do not shake, spin, leap or bounce, they simply let go and settle, they can still be
     dragged, and they fade out instead of flying home. */
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const glyphs = gather(source, page);
  if (!glyphs.length) {
    // Never fail silently: the avatar still answers
    hooks.say("WHATEVER.");
    return false;
  }

  const W = window.innerWidth;
  let H = window.innerHeight;
  const g = (calm ? 1.2 : 2.6) * H; // gravity, px/s^2 (scales with the screen; softer when calm)
  const shakeMs = calm ? 0 : SHAKE_MS;
  const bounce = calm ? 0 : 1;      // scales every rebound
  let floor = H - 1;
  const head = headCollider(W);
  let firstHit = false;
  let gravX = 0, gravY = g;   // where "down" is: a phone's tilt turns it
  let ceiling = false;        // once gravity can point anywhere, the top edge is a wall too
  let tilt = false;           // a phone's tilt is steering gravity
  let pull = false;           // desktop: space is held and the letters are drawn to the cursor
  const ptr = { x: W / 2, y: H / 2 };

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
      held: false, wait: 0, gx: 0, gy: 0, ox: 0, oy: 0, tw: null,
    };
  });
  const byEl = new Map<Element, Body>(bodies.map((b) => [b.el, b]));

  const hint = document.createElement("p");
  hint.className = "egg-hint";
  hint.setAttribute("role", "status");
  const touch = window.matchMedia("(hover: none)").matches;
  hint.textContent = page
    ? `${touch ? "Tap" : "Click"} anywhere to run: git restore .`
    : touch
      ? `Tap anywhere to put it back, or ${calm ? "drag" : "throw"} the letters around`
      : `Click anywhere to put it back, or ${calm ? "drag" : "throw"} the letters around${calm ? "" : " · hold space to pull them in"}`;

  /* The originals are only hidden, never moved or removed (React owns them): the title with
     [data-egg], a whole page by making its text transparent with [data-crumble]. */
  const hideOriginals = () => (page ? document.documentElement : source).setAttribute(page ? "data-crumble" : "data-egg", "");
  const showOriginals = () => { source.removeAttribute("data-egg"); document.documentElement.removeAttribute("data-crumble"); };

  document.body.appendChild(layer);
  document.body.appendChild(hint);
  hideOriginals();

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
      if (page) {
        // A collapse, not a leap: the letters at the bottom of the page let go first
        b.wait = (1 - b.hy / H) * 700 + rand(0, 140);
        b.vx = calm ? 0 : W * rand(-0.06, 0.06);
        b.vy = calm ? 0 : -H * rand(0, 0.1);
        b.w = calm ? 0 : rand(-2.5, 2.5);
      } else if (calm) {
        // Let go and drop straight down: no leap, no sideways burst, no spin
        b.vx = W * rand(-0.01, 0.01);
        b.vy = 0;
        b.w = 0;
      } else {
        b.vx = W * rand(0.04, 0.5) * (Math.random() < 0.2 ? -1 : 1);
        b.vy = -H * rand(0.3, 0.9);
        b.w = rand(-8, 8);
      }
    }
    hooks.say("WHATEVER.", 2200);
  };

  /* ── Physics ── */
  const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  /* A letter's box against a straight edge. (nx, ny) points into the playfield and the edge
     passes through the line n . p = offset (for the floor, the y value; for a wall, x or -x).
     Every corner past the edge gets an impulse with friction at that corner, so the letter
     picks up spin and settles on its side. */
  const boxContact = (b: Body, nx: number, ny: number, edge: number, e0: number) => {
    const c = Math.cos(b.a), s = Math.sin(b.a);
    let deepest = 0;
    const hits: { rx: number; ry: number; d: number }[] = [];
    for (const [sx, sy] of CORNERS) {
      const lx = sx * b.hw, ly = sy * b.hh;
      const rx = lx * c - ly * s, ry = lx * s + ly * c;
      const px = b.x + rx, py = b.y + ry;
      // distance inside the playfield (negative = past the edge)
      const d = ny < 0 ? edge - py : ny > 0 ? py - edge : nx > 0 ? px - edge : edge - px;
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
      if (b.wait > 0) { b.wait -= dt * 1000; continue; } // not let go yet
      if (calm) { b.w = 0; b.a = 0; } // calm: letters never spin, they stay upright
      if (b.held) {
        // Kinematic: chase the pointer. The chasing speed becomes the throw when released.
        b.vx = Math.max(-5000, Math.min(5000, (b.gx - b.x) * 22));
        b.vy = Math.max(-5000, Math.min(5000, (b.gy - b.y) * 22));
        b.w *= 0.9;
      } else if (pull) {
        // Space held: the letters are drawn to the cursor, easing off as they arrive
        const dx = ptr.x - b.x, dy = ptr.y - b.y, d = Math.hypot(dx, dy) || 1;
        const a = 2.4 * g * Math.min(1, d / (0.18 * H));
        b.vx += (dx / d) * a * dt;
        b.vy += (dy / d) * a * dt;
        b.vx *= 1 - 2.2 * dt;
        b.vy *= 1 - 2.2 * dt;
      } else {
        b.vx += gravX * dt;
        b.vy += gravY * dt;
        b.vx *= 1 - 0.04 * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.w * dt;

      if (b.held) continue;

      // Screen edges: the glyph's box, so letters tumble onto their sides and lie flat
      b.w *= 1 - 0.25 * dt;
      boxContact(b, 0, -1, floor, 0.32 * bounce);
      boxContact(b, 1, 0, 0, 0.45 * bounce);
      boxContact(b, -1, 0, W, 0.45 * bounce);
      if (ceiling) boxContact(b, 0, 1, 0, 0.32 * bounce);
      // Come to rest instead of jittering, but only against an edge that gravity is pressing it
      // onto, and never stop it sliding along that edge when gravity is also pulling it along.
      if (!pull && Math.abs(b.w) < 0.5) {
        const m = Math.max(b.hw, b.hh) * 1.5;
        const along = 0.12 * g; // gravity along an edge below this is too little to slide on
        const onFloor = gravY > 0.25 * g && b.y + m > floor;
        const onCeiling = ceiling && gravY < -0.25 * g && b.y - m < 0;
        const onRight = gravX > 0.25 * g && b.x + m > W;
        const onLeft = gravX < -0.25 * g && b.x - m < 0;
        if ((onFloor || onCeiling) && Math.abs(b.vy) < 14 && (Math.abs(gravX) >= along || Math.abs(b.vx) < 9)) {
          b.vy = 0; b.w = 0;
          if (Math.abs(gravX) < along) b.vx = 0;
        }
        if ((onRight || onLeft) && Math.abs(b.vx) < 14 && (Math.abs(gravY) >= along || Math.abs(b.vy) < 9)) {
          b.vx = 0; b.w = 0;
          if (Math.abs(gravY) < along) b.vy = 0;
        }
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
            const rebound = calm ? 0.1 : 0.55;
            b.vx -= (1 + rebound) * vn * nx;
            b.vy -= (1 + rebound) * vn * ny;
            b.w += (b.vx * ny - b.vy * nx) / b.r * 0.15 + rand(-3, 3);
            if (!firstHit && -vn > H * 0.3) {
              firstHit = true;
              hooks.say("OW!", 1400);
              if (!calm) hooks.nod();
            }
          }
        }
      }
    }

    // Letters against letters
    for (let i = 0; i < bodies.length; i++) {
      const p = bodies[i];
      if (p.tw || p.wait > 0) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const q = bodies[j];
        if (q.tw || q.wait > 0 || (p.held && q.held)) continue;
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
          const jn = (-(1 + 0.22 * bounce) * vn) / sum;
          p.vx -= jn * nx * ip; p.vy -= jn * ny * ip;
          q.vx += jn * nx * iq; q.vy += jn * ny * iq;
          p.w += rand(-1, 1) * Math.min(6, -vn / 400);
          q.w += rand(-1, 1) * Math.min(6, -vn / 400);
        }
      }
    }

    // The screen edges get the last word: in a dense pile the letters on top push the ones
    // below into the floor, and nothing may end a step outside the screen.
    for (const b of bodies) {
      if (b.tw || b.wait > 0 || b.held) continue;
      boxContact(b, 0, -1, floor, 0.32 * bounce);
      boxContact(b, 1, 0, 0, 0.45 * bounce);
      boxContact(b, -1, 0, W, 0.45 * bounce);
      if (ceiling) boxContact(b, 0, 1, 0, 0.32 * bounce);
    }
  };

  /* ── Frame loop ── */
  const startReturn = (now: number) => {
    if (phase === "return") return;
    phase = "return";
    returnAt = now;
    hint.classList.remove("is-on");
    if (calm) {
      // No flight home: the letters fade out where they lie and the title is simply there
      // again. The Web Animations API is not affected by the page's reduced-motion CSS,
      // which would make a CSS fade instant; this is an opacity change only, nothing moves.
      bodies.forEach((b) => { b.held = false; });
      showOriginals();
      if (typeof layer.animate === "function") {
        layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-out", fill: "forwards" })
          .onfinish = () => finish();
      } else {
        finish();
      }
      return;
    }
    // Each letter leaves a beat after the one before; a whole page is capped at about a second
    const stagger = Math.min(RETURN_STAGGER_MS, 900 / bodies.length);
    bodies.forEach((b, i) => {
      b.held = false;
      b.wait = 0;
      const turns = Math.round(b.a / (Math.PI * 2));
      b.tw = {
        t0: now + i * stagger, dur: RETURN_MS,
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
      if (shakeMs) render(1 + 3.5 * Math.min(1, (now - t0) / shakeMs));
      if (now - t0 >= shakeMs) { phase = "fall"; release(); acc = 0; }
    } else if (phase === "fall") {
      acc += dtReal;
      while (acc >= STEP) { step(STEP); acc -= STEP; }
      render(0);
      if (now - t0 > shakeMs + 1100) { hint.classList.add("is-on"); tiltBtn?.classList.add("is-on"); }
      if (pull) touched = now;
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
    ptr.x = e.clientX; ptr.y = e.clientY;
    for (const b of bodies) {
      if (b.held) { b.gx = e.clientX - b.ox; b.gy = e.clientY - b.oy; touched = performance.now(); }
    }
  };
  const onUp = () => {
    for (const b of bodies) if (b.held) b.held = false;
    touched = performance.now();
  };
  const onDocDown = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest(".egg-letter, .egg-tilt")) return;
    if (performance.now() - t0 < IGNORE_RETURN_MS) return;
    startReturn(performance.now());
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") startReturn(performance.now());
    // Desktop: hold space and gravity points at the cursor
    if (e.code === "Space" && !touch && !calm && phase === "fall" &&
        !(e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) {
      e.preventDefault();
      pull = true;
      ceiling = true;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") pull = false;
  };
  const onBlur = () => { pull = false; };
  const onHide = () => { if (document.hidden) finish(); };
  const onResize = () => {
    // A phone resizes the window every time the browser's toolbar slides in or out, and that
    // only changes the height: carry on, with the floor where the screen now ends. A new
    // width means the layout really changed (rotation, desktop window): the measurements no
    // longer match the screen, so the letters go home.
    if (window.innerWidth !== W) { finish(); return; }
    H = window.innerHeight;
    floor = H - 1;
  };

  /* ── Tilt: a phone's own tilt steers gravity, and shaking it scatters the letters ──
     Android sends motion freely. iPhones ask first, and only inside a tap, so there the
     letters wait for a "Tilt your phone" button. Not offered with reduced motion. */
  type MotionEventCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
  const motion = typeof DeviceMotionEvent !== "undefined" ? (DeviceMotionEvent as MotionEventCtor) : null;
  let tiltBtn: HTMLButtonElement | null = null;
  let sign = 0;                  // which way this phone reports gravity, learnt from the first upright reading
  let tiltX = 0, tiltY = 1;      // smoothed direction of gravity on the screen, in g
  let lastAcc: [number, number, number] | null = null;
  let lastShake = 0;
  let tiltSeen = false;          // the phone has sent at least one reading

  const scatter = () => {
    touched = performance.now();
    for (const b of bodies) {
      b.vx += rand(-1, 1) * W * 1.3;
      b.vy += rand(-2.2, 0.2) * H; // a shake mostly tosses them up, well clear of the pile
      b.w += rand(-9, 9);
    }
  };
  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null) return;
    const ax = a.x, ay = a.y, az = a.z ?? 0;
    if (!tiltSeen) {
      // A real sensor is talking: now the hint can promise it
      tiltSeen = true;
      hint.textContent = "Tilt or shake your phone · tap anywhere to put it back";
    }
    // The sign convention differs between phones (iPhones report it upside down), so it is
    // read from the first reading taken while the phone is held up: gravity then points
    // down the screen. Until then the letters just fall.
    if (!sign) {
      if (Math.abs(ay) < 3) return;
      sign = ay > 0 ? 1 : -1;
    }
    let tx = (-sign * ax) / 9.81;
    let ty = (sign * ay) / 9.81;
    const len = Math.hypot(tx, ty);
    if (len > 1) { tx /= len; ty /= len; }
    const moved = Math.hypot(tx - tiltX, ty - tiltY);
    tiltX += (tx - tiltX) * 0.25;
    tiltY += (ty - tiltY) * 0.25;
    gravX = tiltX * g;
    gravY = tiltY * g;
    const now = performance.now();
    if (moved > 0.02) touched = now;
    // A sharp jolt between two readings is a shake
    if (lastAcc && Math.hypot(ax - lastAcc[0], ay - lastAcc[1], az - lastAcc[2]) > 16 && now - lastShake > 700) {
      lastShake = now;
      scatter();
    }
    lastAcc = [ax, ay, az];
  };
  const enableTilt = () => {
    if (tilt || finished) return;
    tilt = true;
    ceiling = true;
    tiltBtn?.remove();
    tiltBtn = null;
    window.addEventListener("devicemotion", onMotion);
  };
  if (!calm && touch && motion) {
    if (typeof motion.requestPermission === "function") {
      const ask = motion.requestPermission.bind(motion);
      tiltBtn = document.createElement("button");
      tiltBtn.type = "button";
      tiltBtn.className = "egg-tilt";
      tiltBtn.textContent = "Tilt your phone";
      tiltBtn.addEventListener("click", () => {
        // Called straight from the tap: iPhones only show their permission prompt then
        ask().then(
          (answer) => { if (answer === "granted") enableTilt(); else { tiltBtn?.remove(); tiltBtn = null; } },
          () => { tiltBtn?.remove(); tiltBtn = null; },
        );
      });
      document.body.appendChild(tiltBtn);
    } else {
      enableTilt();
    }
  }

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
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("devicemotion", onMotion);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("resize", onResize);
    layer.remove();
    hint.remove();
    tiltBtn?.remove();
    showOriginals();
    if (page && phase === "return") hooks.say("RESTORED.", 1500);
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
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("resize", onResize);

  render(0);
  raf = requestAnimationFrame(frame);
  return true;
}
