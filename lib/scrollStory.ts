import React, { useEffect } from "react";

/* Globals lock html/body for the 3D home page. Scroll-story pages need the
   viewport itself to scroll (body overflow visible), otherwise position:sticky
   pins against a non-scrolling body. */
export function useScrollUnlock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { hy: html.style.overflowY, bo: body.style.overflow, bh: body.style.height };
    html.style.overflowY = "auto";
    body.style.overflow = "visible";
    body.style.height = "auto";
    return () => {
      html.style.overflowY = prev.hy;
      body.style.overflow = prev.bo;
      body.style.height = prev.bh;
    };
  }, []);
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* Writes --p (0..1 progress through each [data-chapter]) and --pg (whole page)
   as CSS variables; all motion is then pure CSS.
   --p is eased toward the real scroll position every frame, so wheel notches and
   touch flings glide instead of stepping.
   root[data-tone] flips light/dark under the fixed nav: chapters declare
   data-tone="dark", or data-dark-from="0.6" (dark once their progress passes it). */
export function useChapterProgress(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-chapter]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cur = new Map<HTMLElement, number>();
    const written = new Map<HTMLElement, number>();
    let raf = 0;
    let lastT = 0;
    let activeUntil = 0;
    let lastPg = -1;
    let lastTone = "";

    const frame = (t: number) => {
      raf = 0;
      const dt = lastT ? Math.min(64, t - lastT) : 16;
      lastT = t;
      const vh = window.innerHeight;
      const k = 1 - Math.exp(-dt / 100);
      let moving = false;
      let tone = "light";

      for (const el of chapters) {
        const r = el.getBoundingClientRect();
        const span = r.height - vh;
        const target = span > 0 ? clamp01(-r.top / span) : 0;
        const near = r.top < vh * 1.5 && r.bottom > -vh * 0.5;
        let c = cur.get(el);
        if (c === undefined || reduce || !near) {
          c = target;
        } else {
          c += (target - c) * k;
          if (Math.abs(target - c) < 0.0004) c = target;
          else moving = true;
        }
        cur.set(el, c);

        const v = Math.round(c * 10000) / 10000;
        if (written.get(el) !== v) {
          written.set(el, v);
          el.style.setProperty("--p", String(v));
        }

        if (r.top <= 28 && r.bottom > 28) {
          const from = el.dataset.darkFrom;
          if (el.dataset.tone === "dark" || (from !== undefined && target >= parseFloat(from))) tone = "dark";
        }
      }

      if (tone !== lastTone) {
        lastTone = tone;
        root.dataset.tone = tone;
      }

      const rr = root.getBoundingClientRect();
      const total = rr.height - vh;
      const pg = total > 0 ? Math.round(clamp01(-rr.top / total) * 1000) / 1000 : 0;
      if (pg !== lastPg) {
        lastPg = pg;
        root.style.setProperty("--pg", String(pg));
      }

      if (moving || performance.now() < activeUntil) raf = requestAnimationFrame(frame);
      else lastT = 0;
    };

    const wake = () => {
      activeUntil = performance.now() + 160;
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // Capture: the scrolling element may not be the window.
    window.addEventListener("scroll", wake, { passive: true, capture: true });
    window.addEventListener("resize", wake);
    wake();
    return () => {
      window.removeEventListener("scroll", wake, { capture: true });
      window.removeEventListener("resize", wake);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

/** Typed helper for passing CSS custom properties through `style`. */
export const cv = (o: Record<string, string | number>) => o as React.CSSProperties;
