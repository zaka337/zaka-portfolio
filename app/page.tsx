"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";

const AvatarScene = dynamic(() => import("@/components/AvatarScene"), {
  ssr: false,
  loading: () => null,
});

const TERMS = [
  { l1: "FULL-STACK", l2: "DEVELOPER" },
  { l1: "FRONTEND",   l2: "DEVELOPER" },
  { l1: "QA",         l2: "AUTOMATION" },
  { l1: "FLUTTER",    l2: "BUILDER" },
  { l1: "REACT &",    l2: "NEXT.JS" },
  { l1: "API",        l2: "ENGINEER" },
  { l1: "FIREBASE",   l2: "EXPERT" },
  { l1: "N8N",        l2: "WORKFLOWS" },
  { l1: "SELENIUM",   l2: "TESTER" },
  { l1: "VERCEL",     l2: "DEPLOYER" },
];

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function tickChar(c: string): string {
  if (c === " " || c === "-" || c === "&" || c === "." || c === "/") return c;
  return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

function scramble(s: string): string {
  return s.split("").map(tickChar).join("");
}

function RoleBlock() {
  const [l1, setL1] = useState("FULL-STACK");
  const [l2, setL2] = useState("DEVELOPER");
  const [active, setActive] = useState(false);
  const timer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick    = useRef(0);
  const termRef = useRef(0);

  const TICK_MS      = 55;   // ms per char-flip
  const TICKS_LOCK   = 6;    // scramble ticks before locking in the real term
  const TICKS_SHOW   = 3;    // ticks to hold the readable term before next scramble
  const CYCLE        = TICKS_LOCK + TICKS_SHOW;

  const onEnter = () => {
    setActive(true);
    tick.current = 0;
    termRef.current = 0;

    timer.current = setInterval(() => {
      const t = tick.current % CYCLE;
      const term = TERMS[termRef.current % TERMS.length];

      if (t < TICKS_LOCK) {
        // scramble phase — each char ticks independently
        setL1(scramble(term.l1));
        setL2(scramble(term.l2));
      } else {
        // lock phase — show the real word
        setL1(term.l1);
        setL2(term.l2);
        if (t === CYCLE - 1) {
          termRef.current += 1; // advance to next term
        }
      }

      tick.current += 1;
    }, TICK_MS);
  };

  const onLeave = () => {
    setActive(false);
    if (timer.current) clearInterval(timer.current);
    setL1("FULL-STACK");
    setL2("DEVELOPER");
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <div
      className="block-mr nav-text"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        cursor: "default",
        fontFamily: active
          ? "'Courier New', Courier, monospace"
          : undefined,
        transition: "font-family 0s",
      }}
    >
      <p className="nav-item">{l1}</p>
      <p className="nav-item">{l2}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="portfolio-root">
      <AvatarScene />

      {/* TOP LEFT — name */}
      <div className="block-tl">
        <p className="label">YOU CAN CALL ME</p>
        <div className="nav-text">
          <h1 className="title-huge">ZAKA.</h1>
          <p className="title-sub">OR WHATEVER.</p>
        </div>
      </div>

      {/* TOP RIGHT — contact */}
      <Link href="/contact" className="block-tr nav-text" style={{ textDecoration: "none" }}>
        <p className="nav-item">SAY</p>
        <p className="nav-item">HI</p>
      </Link>

      {/* MID LEFT — about */}
      <Link href="/about" className="block-ml nav-text" style={{ textDecoration: "none" }}>
        <p className="nav-item">MORE</p>
        <p className="nav-item">ABOUT ME</p>
      </Link>

      {/* MID RIGHT — role scrambler */}
      <RoleBlock />

      {/* BOTTOM LEFT — projects */}
      <Link href="/projects" className="block-bl nav-text" style={{ textDecoration: "none" }}>
        <p className="nav-item">MY</p>
        <p className="nav-item">PROJECTS</p>
      </Link>

      {/* BOTTOM RIGHT — contact */}
      <div className="block-br nav-text">
        <p className="nav-item">CONTACT</p>
        <p className="nav-item">ME</p>
      </div>
    </main>
  );
}
