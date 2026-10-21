"use client";

import { useEffect, useRef } from "react";

/* A number that counts up to its value, easing out. With Reduce Motion it is simply there. */
export default function CountUp({ to, ms = 1100, decimals = 0, suffix = "", delay = 0 }: {
  to: number; ms?: number; decimals?: number; suffix?: string; delay?: number;
}) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const show = (v: number) => { node.textContent = `${v.toFixed(decimals)}${suffix}`; };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { show(to); return; }
    let raf = 0;
    let t0 = 0;
    const start = window.setTimeout(() => {
      const frame = (now: number) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / ms);
        show(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, delay);
    show(0);
    return () => { window.clearTimeout(start); cancelAnimationFrame(raf); };
  }, [to, ms, decimals, suffix, delay]);
  return <span ref={el} className="hr-count">{`${to.toFixed(decimals)}${suffix}`}</span>;
}
