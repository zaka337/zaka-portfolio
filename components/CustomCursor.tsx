"use client";

import { useRef, useEffect } from "react";

// The ring used to chase the pointer at 10% per frame, which is twice as fast on a
// 120Hz screen as on a 60Hz one. Same feel (about 158ms to close the gap), now
// independent of the refresh rate.
const RING_TAU_MS = 158;

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't animate on touch-primary devices
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const pos = { x: -200, y: -200 };
    const at = { x: -200, y: -200 };
    let raf = 0;
    let last = 0;

    // Park both parts off-screen until the pointer first moves (they would otherwise
    // sit at the top-left corner, since there is no loop running to place them).
    dot.style.transform = "translate3d(-200px, -200px, 0)";
    ring.style.transform = "translate3d(-200px, -200px, 0)";

    // The loop only runs while the ring is still catching up with the pointer, so an
    // idle page does no per-frame work at all.
    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16.7;
      last = t;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

      const k = 1 - Math.exp(-dt / RING_TAU_MS);
      at.x += (pos.x - at.x) * k;
      at.y += (pos.y - at.y) * k;
      const settled = Math.abs(pos.x - at.x) < 0.05 && Math.abs(pos.y - at.y) < 0.05;
      if (settled) { at.x = pos.x; at.y = pos.y; }
      ring.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;

      if (settled) { raf = 0; last = 0; return; }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      wake();
    };
    // Ring grows over links and buttons. Delegated mouseover fires only when the
    // element under the pointer changes (a global html:has(a:hover) rule made the
    // browser re-check selectors on every hover change instead).
    const onOver = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("a, button") : null;
      ring.classList.toggle("is-active", !!el);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Size, border, transition all in globals.css — inline only for position */}
      <div ref={ringRef} className="custom-cursor-ring" />
      <div ref={dotRef}  className="custom-cursor-dot"  />
    </>
  );
}
