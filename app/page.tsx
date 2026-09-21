"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useEffect } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const l1Ref  = useRef<HTMLParagraphElement>(null);
  const l2Ref  = useRef<HTMLParagraphElement>(null);
  const timer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick   = useRef(0);
  const termIdx = useRef(0);

  const TICK_MS    = 55;
  const TICKS_LOCK = 6;
  const TICKS_SHOW = 3;
  const CYCLE      = TICKS_LOCK + TICKS_SHOW;

  const onEnter = () => {
    if (containerRef.current) containerRef.current.style.fontFamily = "'Courier New', Courier, monospace";
    tick.current    = 0;
    termIdx.current = 0;

    timer.current = setInterval(() => {
      const t    = tick.current % CYCLE;
      const term = TERMS[termIdx.current % TERMS.length];

      if (t < TICKS_LOCK) {
        if (l1Ref.current) l1Ref.current.textContent = scramble(term.l1);
        if (l2Ref.current) l2Ref.current.textContent = scramble(term.l2);
      } else {
        if (l1Ref.current) l1Ref.current.textContent = term.l1;
        if (l2Ref.current) l2Ref.current.textContent = term.l2;
        if (t === CYCLE - 1) termIdx.current += 1;
      }
      tick.current += 1;
    }, TICK_MS);
  };

  const onLeave = () => {
    if (containerRef.current) containerRef.current.style.fontFamily = "";
    if (timer.current) clearInterval(timer.current);
    if (l1Ref.current) l1Ref.current.textContent = "FULL-STACK";
    if (l2Ref.current) l2Ref.current.textContent = "DEVELOPER";
  };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <div
      ref={containerRef}
      className="block-mr nav-text"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: "default" }}
    >
      <div className="home-enter home-enter-1">
        <p ref={l1Ref} className="nav-item">FULL-STACK</p>
        <p ref={l2Ref} className="nav-item">DEVELOPER</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="portfolio-root">
      <AvatarScene />

      {/* TOP LEFT — name */}
      <div className="block-tl">
        <div className="home-enter home-enter-0">
          <p className="label">YOU CAN CALL ME</p>
          <div className="nav-text">
            <h1 className="title-huge">ZAKA.</h1>
            <p className="title-sub">OR WHATEVER.</p>
          </div>
        </div>
      </div>

      {/* TOP RIGHT — contact */}
      <Link href="/contact" className="block-tr nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-2">
          <p className="nav-item">SAY</p>
          <p className="nav-item">HI</p>
        </div>
      </Link>

      {/* MID LEFT — about */}
      <Link href="/about" className="block-ml nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-3">
          <p className="nav-item">MORE</p>
          <p className="nav-item">ABOUT ME</p>
        </div>
      </Link>

      {/* MID RIGHT — role scrambler */}
      <RoleBlock />

      {/* BOTTOM LEFT — projects */}
      <Link href="/projects" className="block-bl nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-4">
          <p className="nav-item">MY</p>
          <p className="nav-item">PROJECTS</p>
        </div>
      </Link>

      {/* BOTTOM RIGHT — contact me page */}
      <Link href="/contact-me" className="block-br nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-5">
          <p className="nav-item">CONTACT</p>
          <p className="nav-item">ME</p>
        </div>
      </Link>

      {/* Visually hidden — crawlable description for search engines */}
      <p style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
        {'Zaka Ullah Waheed is a Full-Stack Developer from Pakistan specialising in React, Next.js, Flutter, and QA Automation. This is a 3D interactive portfolio featuring a real-time WebGL avatar built with Three.js. Open to remote work and freelance projects.'}
      </p>
    </main>
  );
}
