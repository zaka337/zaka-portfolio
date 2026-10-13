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

/* Writes --p (0..1 progress through each [data-chapter]) and --pg (whole page)
   as CSS variables; all motion is then pure CSS. */
export function useChapterProgress(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-chapter]"));
    const last = new Map<HTMLElement, number>();
    let lastPg = -1;
    let raf = 0;

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of chapters) {
        const r = el.getBoundingClientRect();
        const span = r.height - vh;
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        const v = Math.round(p * 1000) / 1000;
        if (last.get(el) !== v) {
          last.set(el, v);
          el.style.setProperty("--p", String(v));
        }
      }
      const rr = root.getBoundingClientRect();
      const total = rr.height - vh;
      const pg = total > 0 ? Math.round(Math.min(1, Math.max(0, -rr.top / total)) * 1000) / 1000 : 0;
      if (pg !== lastPg) {
        lastPg = pg;
        root.style.setProperty("--pg", String(pg));
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Capture: the scrolling element may not be the window.
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

/** Typed helper for passing CSS custom properties through `style`. */
export const cv = (o: Record<string, string | number>) => o as React.CSSProperties;
