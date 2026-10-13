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
   touch flings glide instead of stepping. Requires useScrollUnlock (window scrolls).
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
    // Geometry is measured once (and on resize), never per frame: reading layout
    // right after writing styles would force a synchronous layout every frame.
    const geo = new Map<HTMLElement, { top: number; h: number }>();
    let rootGeo = { top: 0, h: 0 };
    let raf = 0;
    let lastT = 0;
    let activeUntil = 0;
    let lastPg = -1;
    let lastTone = "";

    const measure = () => {
      const sy = window.scrollY;
      for (const el of chapters) {
        const r = el.getBoundingClientRect();
        geo.set(el, { top: r.top + sy, h: r.height });
      }
      const rr = root.getBoundingClientRect();
      rootGeo = { top: rr.top + sy, h: rr.height };
    };

    const frame = (t: number) => {
      raf = 0;
      const dt = lastT ? Math.min(64, t - lastT) : 16;
      lastT = t;
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const k = 1 - Math.exp(-dt / 100);
      let moving = false;
      let tone = "light";

      for (const el of chapters) {
        const g = geo.get(el);
        if (!g) continue;
        const span = g.h - vh;
        const target = span > 0 ? clamp01((sy - g.top) / span) : 0;
        const near = g.top < sy + vh * 1.5 && g.top + g.h > sy - vh * 0.5;
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

        if (g.top <= sy + 28 && g.top + g.h > sy + 28) {
          const from = el.dataset.darkFrom;
          if (el.dataset.tone === "dark" || (from !== undefined && target >= parseFloat(from))) tone = "dark";
        }
      }

      if (tone !== lastTone) {
        lastTone = tone;
        root.dataset.tone = tone;
      }

      const total = rootGeo.h - vh;
      const pg = total > 0 ? Math.round(clamp01((sy - rootGeo.top) / total) * 1000) / 1000 : 0;
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
    const remeasure = () => {
      measure();
      wake();
    };

    measure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(root);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    wake();
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

/** Typed helper for passing CSS custom properties through `style`. */
export const cv = (o: Record<string, string | number>) => o as React.CSSProperties;
