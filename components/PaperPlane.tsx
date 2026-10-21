"use client";

import { useEffect, useRef, useState } from "react";
import { play } from "@/lib/sound";
import "./paperplane.css";

/* The paper plane. When the project brief has really been sent (the form says so with a
   `zk-sent` event, app/contact-me/page.tsx), a paper plane takes off from the send button, loops
   once and flies off the top corner of the screen, leaving a dotted trail. It only draws over the
   page: nothing about the form changes. With Reduce Motion it does not fly: a small plane
   fades in above the button and out again. */

interface Run { id: number; pts: { x: number; y: number; a: number }[]; calm: boolean; x: number; y: number }

const DURATION = 2100;
const N = 40;

/* A cubic curve from the button, up and back like a throw, then off the top right of the screen */
function flightPath(x0: number, y0: number): { x: number; y: number; a: number }[] {
  const W = innerWidth, H = innerHeight;
  const p0 = { x: x0, y: y0 };
  const p1 = { x: x0 - Math.min(140, W * 0.25), y: y0 - Math.min(260, H * 0.4) };
  const p2 = { x: W * 0.6, y: H * 0.04 };
  const p3 = { x: W + 140, y: -160 };
  const at = (u: number) => {
    const v = 1 - u;
    return {
      x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
      y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
    };
  };
  const out: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = t * t * (1.6 - 0.6 * t); // eases in: it hesitates, then goes
    const p = at(u);
    const q = at(Math.min(1, u + 0.01));
    out.push({ x: p.x, y: p.y, a: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI });
  }
  return out;
}

export default function PaperPlane() {
  const [run, setRun] = useState<Run | null>(null);
  const plane = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    const onSent = () => {
      const r = document.querySelector(".cm-send")?.getBoundingClientRect();
      const x = r ? r.left + r.width / 2 : innerWidth / 2;
      const y = r ? r.top + r.height / 2 : innerHeight * 0.7;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      play(calm ? "tick" : "whoosh");
      window.clearTimeout(timer.current);
      setRun({ id: Date.now(), pts: calm ? [] : flightPath(x, y), calm, x, y });
      timer.current = window.setTimeout(() => setRun(null), calm ? 1900 : DURATION + 700);
    };
    window.addEventListener("zk-sent", onSent);
    return () => {
      window.removeEventListener("zk-sent", onSent);
      window.clearTimeout(timer.current);
    };
  }, []);

  // The flight itself: the browser animates it along the sampled curve
  useEffect(() => {
    const node = plane.current;
    if (!run || run.calm || !node) return;
    const frames = run.pts.map((p, i) => ({
      offset: i / N,
      // The sprite points up and to the right (42 degrees), so it is turned to follow the curve
      transform: `translate3d(${p.x - 20}px, ${p.y - 20}px, 0) rotate(${p.a + 42}deg) scale(${0.5 + 0.5 * Math.min(1, (i / N) * 4)})`,
    }));
    const a = node.animate(frames, { duration: DURATION, easing: "linear", fill: "forwards" });
    return () => a.cancel();
  }, [run]);

  if (!run) return null;

  const svg = (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <path d="M3 19 L37 4 L24 36 L18 24 Z" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M37 4 L18 24" stroke="currentColor" strokeWidth="1.4" />
      <path d="M18 24 L16.5 33 L24 36 Z" fill="currentColor" opacity="0.28" />
    </svg>
  );

  if (run.calm) {
    return <div className="pp-calm" style={{ left: run.x - 20, top: run.y - 62 }} aria-hidden="true">{svg}</div>;
  }

  return (
    <div className="pp-layer" key={run.id} aria-hidden="true">
      {run.pts.map((p, i) => i % 2 === 0 && i > 1 && (
        <i key={i} className="pp-dot" style={{ left: p.x - 2, top: p.y - 2, animationDelay: `${((i / N) * DURATION).toFixed(0)}ms` }} />
      ))}
      <div ref={plane} className="pp-plane" style={{ transform: `translate3d(${run.pts[0].x - 20}px, ${run.pts[0].y - 20}px, 0) scale(0.5)` }}>
        {svg}
      </div>
    </div>
  );
}
