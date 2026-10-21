"use client";

import { useRef, useEffect } from "react";
import "./cursor.css";

/* The cursor is a full stop: the dot from "ZAKA." that got loose. It punctuates what you do.

     moving fast    the dot drags a comma-shaped tail behind it, longer the faster you go
     over a link    it becomes an arrow, or a diagonal arrow if the link leaves the site, or @ for mail
     over a button  the dot sits inside a ring
     over the face  a typographic smiley (:) turned on its side), and a wink (;) when you press
     over the role  a question mark, over the title an exclamation mark
     shaken hard    ?!
     scrolling      an arrow down or up
     left alone     it waits with three bouncing dots (...), and after a while falls asleep (zZ)
     woken up       a jolt (!)
     pressed        it squashes and a ring ripples out
     over a field   it steps aside for the real text cursor

   The dot always sits exactly on the pointer (that is the click point); only the decoration moves
   with a delay. The per-frame loop runs only while the pointer is moving, so an idle page does no
   work. Reduce Motion and calm mode keep the glyphs but drop the tail. Decorative only: aria-hidden. */

type G =
  | "" | "away" | "text" | "shake" | "up" | "down" | "wake" | "idle" | "sleep"
  | "arrow" | "ext" | "mail" | "bang" | "ask" | "smile" | "ring" | "cross" | "drag";

// The glyphs are written as escapes: non-ASCII characters in source files have broken the build before
const CHARS: Partial<Record<G, string>> = {
  arrow: "→", ext: "↗", mail: "@", bang: "!", ask: "?", smile: ":)", shake: "?!",
  up: "↑", down: "↓", wake: "!", cross: "+", drag: "↔",
};

const SEL = "a, button, [data-hot], input, textarea, select, [contenteditable='true'], [role='button'], summary";
const TEXTY = /^(text|search|email|tel|url|password|number|)$/;

const kind = (t: EventTarget | null): G => {
  if (!(t instanceof Element)) return "";
  const e = t.closest(SEL);
  if (!e) {
    if (t.closest(".xr-layer")) return "cross";                       // the X-ray blueprint
    if (t.closest("[style*='cursor: grab']")) return "drag";           // the 3D project carousel
    return "";
  }
  if (e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement || (e as HTMLElement).isContentEditable) return "text";
  if (e instanceof HTMLInputElement) return TEXTY.test(e.type) ? "text" : "ring";
  if (e.classList.contains("face-hit")) return "smile";
  if (e.classList.contains("rt")) return "ask";
  if (e instanceof HTMLAnchorElement) {
    if (e.protocol === "mailto:") return "mail";
    return e.target === "_blank" || e.origin !== location.origin ? "ext" : "arrow";
  }
  if (e.hasAttribute("data-hot") && !(e instanceof HTMLButtonElement)) return "bang"; // the title that falls over
  return "ring";
};

const IDLE_AFTER = 2400;   // ms of stillness before the dots
const SLEEP_AFTER = 12500; // ms more before it falls asleep

export default function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const glyphRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Not on touch-primary devices
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const root = rootRef.current, tail = tailRef.current, glyph = glyphRef.current, ripple = rippleRef.current;
    if (!root || !tail || !glyph || !ripple) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // no tail, no jolts
    const html = document.documentElement;
    html.setAttribute("data-zcur", ""); // from now on the real cursor is hidden everywhere (see cursor.css)

    const pos = { x: -200, y: -200 };
    const prev = { x: -200, y: -200 };
    let vx = 0, vy = 0, raf = 0, last = 0, tailOn = false;
    let shown = false, away = false, down = false;
    let hover: G = "", scrollG: G = "";
    let shakeOn = false, wakeOn = false, idle = false, asleep = false;
    let lastMove = 0, idleT = 0, sleepT = 0, scrollT = 0, wakeT = 0, shakeT = 0;
    let cur: G = "away";
    let lx = 0, ly = 0, sx = 0, sy = 0;
    const revX: number[] = [], revY: number[] = [];

    const resolve = () => {
      const g: G = away || !shown ? "away"
        : hover === "text" ? "text"
        : shakeOn ? "shake"
        : scrollG ? scrollG
        : wakeOn ? "wake"
        : hover ? hover
        : asleep ? "sleep"
        : idle ? "idle"
        : "";
      if (g === cur) return;
      cur = g;
      root.dataset.g = g;
      const ch = CHARS[g];
      root.classList.toggle("has-g", !!ch);
      glyph.classList.remove("is-on");
      if (ch) {
        glyph.textContent = down && g === "smile" ? ";)" : ch;
        void glyph.offsetWidth; // restart the pop-in
        glyph.classList.add("is-on");
      }
    };

    // The tail and the position. Runs only while the pointer is moving.
    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16.7;
      last = t;
      root.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      let moving = false;
      if (!still) {
        const k = 1 - Math.exp(-dt / 80);
        vx += ((pos.x - prev.x) / dt - vx) * k;
        vy += ((pos.y - prev.y) / dt - vy) * k;
        prev.x = pos.x; prev.y = pos.y;
        const sp = Math.hypot(vx, vy); // px per ms
        const l = Math.max(0, Math.min(1, (sp - 0.14) / 1.5));
        if (l > 0.02) {
          tail.style.opacity = String(Math.min(1, l * 2.2).toFixed(2));
          tail.style.transform = `rotate(${Math.atan2(vx, -vy).toFixed(3)}rad) scaleY(${l.toFixed(3)})`;
          tailOn = true;
        } else if (tailOn) {
          tail.style.opacity = "0";
          tailOn = false;
        }
        moving = sp > 0.02 || tailOn;
      }
      if (moving) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; vx = vy = 0; }
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    /* Waiting: three dots after a short while, asleep after a longer one */
    const checkIdle = () => {
      idleT = 0;
      const quiet = performance.now() - lastMove;
      if (quiet < IDLE_AFTER) { idleT = window.setTimeout(checkIdle, IDLE_AFTER - quiet + 20); return; }
      idle = true;
      resolve();
      sleepT = window.setTimeout(() => { asleep = true; resolve(); }, SLEEP_AFTER);
    };
    const rouse = () => {
      const wasAsleep = asleep;
      idle = false; asleep = false;
      window.clearTimeout(sleepT);
      if (wasAsleep && !still) {
        wakeOn = true;
        window.clearTimeout(wakeT);
        wakeT = window.setTimeout(() => { wakeOn = false; resolve(); }, 650);
      }
    };

    /* Shaking: the pointer changing direction again and again, quickly */
    const reversals = (list: number[], d: number, s: number, now: number) => {
      if (Math.abs(d) <= 4) return s;
      const ns = d > 0 ? 1 : -1;
      if (s && ns !== s) list.push(now);
      while (list.length && now - list[0] > 700) list.shift();
      return ns;
    };

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      pos.x = e.clientX;
      pos.y = e.clientY;
      away = false; // a move proves the pointer is inside, whatever mouseenter did or did not report
      if (!shown) {
        shown = true;
        prev.x = pos.x; prev.y = pos.y; lx = pos.x; ly = pos.y;
        root.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        hover = kind(e.target);
      }
      sx = reversals(revX, pos.x - lx, sx, now);
      sy = reversals(revY, pos.y - ly, sy, now);
      lx = pos.x; ly = pos.y;
      if (!still && !shakeOn && (revX.length >= 5 || revY.length >= 5)) {
        shakeOn = true;
        revX.length = 0; revY.length = 0;
        window.clearTimeout(shakeT);
        shakeT = window.setTimeout(() => { shakeOn = false; resolve(); }, 1300);
      }
      lastMove = now;
      if (idle || asleep) rouse();
      if (!idleT) idleT = window.setTimeout(checkIdle, IDLE_AFTER);
      resolve();
      wake();
    };

    // Delegated: fires only when the element under the pointer changes
    const onOver = (e: MouseEvent) => {
      hover = kind(e.target);
      resolve();
    };

    const onDown = () => {
      down = true;
      root.classList.add("is-down");
      if (cur === "smile") glyph.textContent = ";)"; // a wink
      ripple.classList.remove("is-go");
      void ripple.offsetWidth;
      ripple.classList.add("is-go");
    };
    const onUp = () => {
      down = false;
      root.classList.remove("is-down");
      if (cur === "smile") glyph.textContent = ":)";
    };

    const onWheel = (e: WheelEvent) => {
      const el = document.scrollingElement;
      if (!el || el.scrollHeight <= window.innerHeight + 4 || Math.abs(e.deltaY) < 2) return; // nothing to scroll
      scrollG = e.deltaY > 0 ? "down" : "up";
      window.clearTimeout(scrollT);
      scrollT = window.setTimeout(() => { scrollG = ""; resolve(); }, 650);
      resolve();
    };

    const onLeave = () => { away = true; resolve(); };
    const onEnter = () => { away = false; resolve(); };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true, capture: true });
    window.addEventListener("mouseup", onUp, { passive: true, capture: true });
    window.addEventListener("blur", onUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    html.addEventListener("mouseleave", onLeave);
    html.addEventListener("mouseenter", onEnter);

    return () => {
      html.removeAttribute("data-zcur");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("mouseup", onUp, true);
      window.removeEventListener("blur", onUp);
      window.removeEventListener("wheel", onWheel);
      html.removeEventListener("mouseleave", onLeave);
      html.removeEventListener("mouseenter", onEnter);
      if (raf) cancelAnimationFrame(raf);
      [idleT, sleepT, scrollT, wakeT, shakeT].forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={rootRef} className="zk-cur" data-g="away" aria-hidden="true">
      <div ref={tailRef} className="zk-tail" />
      <div className="zk-hold" />
      <div ref={rippleRef} className="zk-ripple" />
      <div className="zk-head" />
      <div className="zk-idle"><i style={{ ["--n" as string]: 0 } as React.CSSProperties} /><i style={{ ["--n" as string]: 1 } as React.CSSProperties} /><i style={{ ["--n" as string]: 2 } as React.CSSProperties} /></div>
      <div className="zk-zz"><b style={{ ["--n" as string]: 0 } as React.CSSProperties}>z</b><b style={{ ["--n" as string]: 1 } as React.CSSProperties}>Z</b><b style={{ ["--n" as string]: 2 } as React.CSSProperties}>z</b></div>
      <div ref={glyphRef} className="zk-glyph" />
    </div>
  );
}
