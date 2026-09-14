"use client";

import { useEffect, useRef, useState } from "react";
import { getRevealIO, revealCallbacks } from "../lib/revealIO";

// ── Direction helpers ──────────────────────────────────────────────

type Direction = "up" | "down" | "left" | "right" | "none";

function hiddenTransform(direction: Direction, distance: number): string {
  switch (direction) {
    case "up":    return `translateY(${distance}px)`;
    case "down":  return `translateY(-${distance}px)`;
    case "left":  return `translateX(${distance}px)`;
    case "right": return `translateX(-${distance}px)`;
    case "none":  return "none";
  }
}

// ── Component ──────────────────────────────────────────────────────

export interface RevealProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;     // transition-delay in ms
  distance?: number;  // initial translate offset in px; default 24
  duration?: number;  // ms override; defaults to CSS var(--duration-slow)
  className?: string;
  style?: React.CSSProperties;
}

export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  distance = 24,
  duration,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Always start hidden — server and client both render opacity:0 initially,
  // preventing a hydration mismatch.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reduced motion: skip animation, reveal immediately.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    const io = getRevealIO();

    // Fail-safe: if IO is unavailable (very old browser), show the content.
    if (!el || !io) {
      setVisible(true);
      return;
    }

    revealCallbacks.set(el, () => setVisible(true));
    io.observe(el);

    return () => {
      io.unobserve(el);
      revealCallbacks.delete(el);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const durationVal = duration !== undefined ? `${duration}ms` : "var(--duration-slow)";
  const easing      = `var(--ease-out)`;
  const delayVal    = `${delay}ms`;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "none" : hiddenTransform(direction, distance),
        // Transition is always present so it fires the moment visibility changes.
        // CSS handles the actual animation — no rAF, no animation loops.
        transition: `opacity ${durationVal} ${easing} ${delayVal}, transform ${durationVal} ${easing} ${delayVal}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
