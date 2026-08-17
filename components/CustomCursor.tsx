"use client";

import { useRef, useEffect } from "react";

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos  = useRef({ x: -200, y: -200 });
  const ring = useRef({ x: -200, y: -200 });
  const raf  = useRef<number>(0);

  useEffect(() => {
    // Don't animate on touch-primary devices
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      ring.current.x += (pos.current.x - ring.current.x) * 0.1;
      ring.current.y += (pos.current.y - ring.current.y) * 0.1;
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className="custom-cursor-ring"
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: 38, height: 38,
          marginLeft: -19, marginTop: -19,
          border: "1.5px solid var(--ink)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
          mixBlendMode: "multiply",
        }}
      />
      <div
        ref={dotRef}
        className="custom-cursor-dot"
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: 7, height: 7,
          marginLeft: -3.5, marginTop: -3.5,
          backgroundColor: "var(--ink)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
        }}
      />
    </>
  );
}
