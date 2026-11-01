import { useCallback, useEffect, useRef, type RefObject } from "react";
import { glideTo } from "@/lib/glide";

/* The Projects "reel": one pinned stage that flows from project to project as the page scrolls.

   Markup contract (app/projects/(featured)/page.tsx):
     [data-reel]                the tall scroll track; its sticky child is the stage
       [data-disc]  x N         the full-bleed colour of each project (an iris that opens as the project arrives)
       [data-marquee]           endless rows of project names (moved by scroll, skewed by scroll speed)
       [data-slide] x N         one project each; [data-tilt] inside it follows the pointer
       [data-rail] [data-counter]   the dot rail and the rolling number
     [data-pg]                  the page progress bar

   What is written, and where (kept small on purpose: see the 120fps notes in the project memory)
   - per slide + its disc:  --o   -1 (still below) .. 0 (resting) .. +1 (gone above). CSS derives everything from it.
   - slide:  data-state = active | near | off  (and `inert` when not active, so hidden links cannot take focus)
   - rail / counter / root:  the active index, only when it changes
   - marquee rows:  one transform each, only when it changes
   - [data-pg]:  --pg (never on an ancestor: custom properties inherit and would restyle everything)
   Geometry is measured once and on resize, never per frame. All easing is time-based. */

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const smooth01 = (x: number) => x * x * (3 - 2 * x);

/* How much of each project's scroll length it simply rests, fully settled, before the next one takes over.
   Without this the reel never sits still and nothing can be read. */
const DEAD = 0.2;

/* Slide offset -> shaped offset: flat around 0 (the rest), eased in and out toward +-1. */
function shape(d: number) {
  const a = Math.abs(d);
  if (a >= 1) return d < 0 ? -1 : 1;
  const u = Math.max(0, (a - DEAD) / (1 - DEAD));
  return (d < 0 ? -1 : 1) * smooth01(u);
}

export function useReel(rootRef: RefObject<HTMLElement | null>, count: number) {
  const api = useRef<{ goTo: (i: number) => void; top: () => void } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const track = root.querySelector<HTMLElement>("[data-reel]");
    const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
    const discs = Array.from(root.querySelectorAll<HTMLElement>("[data-disc]"));
    const tilts = Array.from(root.querySelectorAll<HTMLElement>("[data-tilt]"));
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-marquee]"));
    const rail = root.querySelector<HTMLElement>("[data-rail]");
    const counter = root.querySelector<HTMLElement>("[data-counter]");
    const pgEls = Array.from(root.querySelectorAll<HTMLElement>("[data-pg]"));
    const N = slides.length;
    if (!track || N < 2) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const railBtns = rail ? Array.from(rail.querySelectorAll<HTMLElement>("button")) : [];

    // Reduced motion: no pinned show. The projects simply sit one under another (CSS), so none may stay inert.
    if (reduce) {
      for (const s of slides) { s.inert = false; s.dataset.state = "active"; }
      const bar = () => {
        const total = root.scrollHeight - window.innerHeight;
        const sy = window.scrollY - (root.getBoundingClientRect().top + window.scrollY);
        const pg = total > 0 ? Math.round(clamp(sy / total, 0, 1) * 1000) / 1000 : 0;
        for (const el of pgEls) el.style.setProperty("--pg", String(pg));
      };
      bar();
      window.addEventListener("scroll", bar, { passive: true });
      window.addEventListener("resize", bar);
      api.current = {
        goTo: (i) => slides[clamp(i, 0, N - 1)].scrollIntoView({ block: "start" }),
        top: () => window.scrollTo({ top: 0 }),
      };
      return () => {
        api.current = null;
        window.removeEventListener("scroll", bar);
        window.removeEventListener("resize", bar);
      };
    }

    let top = 0, slidePx = 1, vh = window.innerHeight, rootTop = 0, rootH = 1;
    let repeatW = rows.map(() => 0);
    const measure = () => {
      const sy = window.scrollY;
      vh = window.innerHeight;
      const r = track.getBoundingClientRect();
      top = r.top + sy;
      slidePx = Math.max(1, (r.height - vh) / (N - 1));
      const rr = root.getBoundingClientRect();
      rootTop = rr.top + sy;
      rootH = rr.height;
      repeatW = rows.map((row) => row.querySelector<HTMLElement>("[data-repeat]")?.getBoundingClientRect().width ?? 0);
    };

    // ── state ──
    let raf = 0, lastT = 0, activeUntil = 0;
    let posS = -1;                                  // the eased slide position (-1 = not set yet)
    let lastSy = window.scrollY, velS = 0;          // scroll speed, for the marquee skew
    let idx = -1, moved = false, lastPg = -1;
    const wrote = slides.map(() => 99);             // last --o written per slide
    const state = slides.map(() => "");
    const rowWrote = rows.map(() => "");
    let tx = 0, ty = 0, cx = 0, cy = 0;             // pointer target / current, -1..1
    let tiltOn = false;

    const frame = (t: number) => {
      raf = 0;
      const dt = lastT ? Math.min(64, t - lastT) : 16;
      lastT = t;
      const sy = window.scrollY;
      let busy = false;

      // ── the reel ──
      const raw = clamp((sy - top) / slidePx, 0, N - 1);
      if (posS < 0 || reduce) posS = raw;
      else {
        posS += (raw - posS) * (1 - Math.exp(-dt / 80));
        if (Math.abs(raw - posS) < 0.0005) posS = raw; else busy = true;
      }

      const nearest = clamp(Math.round(posS), 0, N - 1);
      for (let i = 0; i < N; i++) {
        const d = posS - i;
        const o = Math.round(shape(d) * 1000) / 1000;
        if (wrote[i] !== o) {
          wrote[i] = o;
          slides[i].style.setProperty("--o", String(o));
          discs[i]?.style.setProperty("--o", String(o));
        }
        const s = i === nearest ? "active" : Math.abs(d) < 1.02 ? "near" : "off";
        if (state[i] !== s) {
          state[i] = s;
          slides[i].dataset.state = s;
          slides[i].inert = s !== "active";
        }
      }
      if (nearest !== idx) {
        idx = nearest;
        root.dataset.active = String(idx);
        rail?.setAttribute("data-active", String(idx));
        railBtns.forEach((b, k) => {
          b.toggleAttribute("data-on", k === idx);
          if (k === idx) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
        });
        counter?.style.setProperty("--cur", String(idx));
      }
      const m = sy > top + 24;
      if (m !== moved) { moved = m; root.toggleAttribute("data-moved", m); }

      // ── the endless names: moved by scroll, leaning with its speed ──
      if (!reduce && rows.length) {
        const vel = (sy - lastSy) / dt;
        lastSy = sy;
        velS += (vel - velS) * (1 - Math.exp(-dt / 140));
        if (Math.abs(velS) < 0.004) velS = 0; else busy = true;
        const skew = Math.round(clamp(velS * 2.6, -10, 10) * 20) / 20;
        for (let i = 0; i < rows.length; i++) {
          const W = repeatW[i];
          if (!W) continue;
          const speed = Number(rows[i].dataset.speed || 0.3);
          const off = (Math.abs(sy) * Math.abs(speed)) % W;
          const x = Math.round((speed > 0 ? -off : off - W) * 10) / 10;
          const v = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
          if (rowWrote[i] !== v) { rowWrote[i] = v; rows[i].style.transform = v; }
        }
      } else lastSy = sy;

      // ── the project's picture leans toward the pointer ──
      if (tiltOn) {
        cx += (tx - cx) * (1 - Math.exp(-dt / 130));
        cy += (ty - cy) * (1 - Math.exp(-dt / 130));
        if (Math.abs(tx - cx) < 0.002 && Math.abs(ty - cy) < 0.002) { cx = tx; cy = ty; } else busy = true;
        const el = tilts[nearest];
        if (el) {
          el.style.setProperty("--tx", cx.toFixed(3));
          el.style.setProperty("--ty", cy.toFixed(3));
        }
      }

      // ── the page progress bar (written on the bar only) ──
      const total = rootH - vh;
      const pg = total > 0 ? Math.round(clamp((sy - rootTop) / total, 0, 1) * 1000) / 1000 : 0;
      if (pg !== lastPg) {
        lastPg = pg;
        for (const el of pgEls) el.style.setProperty("--pg", String(pg));
      }

      if (busy || performance.now() < activeUntil) raf = requestAnimationFrame(frame);
      else lastT = 0;
    };

    const wake = () => {
      activeUntil = performance.now() + 160;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const remeasure = () => { measure(); wake(); };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      ty = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
      wake();
    };

    measure();
    tiltOn = finePointer && !reduce;
    const ro = new ResizeObserver(remeasure);
    ro.observe(root);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    if (tiltOn) window.addEventListener("pointermove", onPointer, { passive: true });

    api.current = {
      goTo(i: number) {
        const y = top + clamp(i, 0, N - 1) * slidePx;
        glideTo(y);
      },
      top() {
        glideTo(0);
      },
    };

    // a link like /projects#momcare-ai lands on that project
    const slug = decodeURIComponent(location.hash.slice(1));
    if (slug) {
      const at = slides.findIndex((s) => s.dataset.slug === slug);
      if (at > 0) window.scrollTo(0, top + at * slidePx);
    }
    wake();

    return () => {
      api.current = null;
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
      window.removeEventListener("pointermove", onPointer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef, count]);

  const goTo = useCallback((i: number) => api.current?.goTo(i), []);
  const toTop = useCallback(() => api.current?.top(), []);
  return { goTo, toTop };
}
