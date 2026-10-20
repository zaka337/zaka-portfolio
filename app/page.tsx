"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { knockOver, stopKnockOver } from "@/lib/knockOver";

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

function OpenStatus() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="home-status home-enter home-enter-5">
      <i className="home-status-dot" aria-hidden="true" />
      <span>OPEN FOR WORK {'·'} ISLAMABAD{time ? ` ${time} PKT` : ""}</span>
    </div>
  );
}

export default function Home() {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // Click the title and it falls apart (lib/knockOver.ts). Leaving the page ends it.
  useEffect(() => stopKnockOver, []);
  const knock = () => {
    const el = titleRef.current;
    if (!el) return;
    const say = (text: string, ms?: number) =>
      window.dispatchEvent(new CustomEvent("zk-say", { detail: { text, ms } }));
    try {
      knockOver(el, { say, nod: () => window.dispatchEvent(new Event("zk-nod")) });
    } catch {
      // Whatever a browser refuses: leave the page exactly as it was and let the avatar answer
      stopKnockOver();
      el.removeAttribute("data-egg");
      document.querySelectorAll(".egg-layer, .egg-hint").forEach((n) => n.remove());
      say("WHATEVER.");
    }
  };

  // Mouse parallax for the giant outlined word behind the face
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    // Write the variables on the ghost word itself. On the root they were inherited by
    // every element on the page, so each mouse move re-styled the whole home screen.
    const ghost = root.querySelector<HTMLElement>(".home-ghost");
    if (!ghost) return;
    let raf = 0;
    let mx = 0;
    let my = 0;
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          ghost.style.setProperty("--mx", mx.toFixed(3));
          ghost.style.setProperty("--my", my.toFixed(3));
        });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main ref={rootRef} className="portfolio-root">
      <div className="home-ghost" aria-hidden="true"><span>ZAKA</span></div>
      <AvatarScene />

      {/* TOP LEFT — name */}
      {/* A touch starts it when the finger lifts (onPointerUp), without waiting for the
          browser's own click, which some phones do not send for a plain div. The click
          that may follow is ignored: the effect is already running. */}
      <div ref={titleRef} className="block-tl" data-hot onClick={knock}
        onPointerUp={(e) => { if (e.pointerType === "touch") knock(); }}>
        <div className="home-enter home-enter-0">
          <p className="label">YOU CAN CALL ME</p>
          <div className="nav-text">
            <h1 className="title-huge">ZAKA<span className="blink-dot">.</span></h1>
            <p className="title-sub">OR WHATEVER.</p>
          </div>
        </div>
        {/* Keyboard route to the same click: visible only while focused */}
        <button type="button" className="egg-key" onClick={(e) => { e.stopPropagation(); knock(); }}>
          Knock the title over
        </button>
      </div>

      {/* TOP RIGHT — contact */}
      <Link href="/contact" className="block-tr nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-2">
          <p className="nav-item">SAY</p>
          <p className="nav-item">HI</p>
        </div>
        <p className="nav-hint">PICK UP THE PHONE</p>
      </Link>

      {/* MID LEFT — about */}
      <Link href="/about" className="block-ml nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-3">
          <p className="nav-item">MORE</p>
          <p className="nav-item">ABOUT ME</p>
        </div>
        <p className="nav-hint">STORY {'·'} TOOLKIT {'·'} JOURNEY</p>
      </Link>

      {/* MID RIGHT — role scrambler */}
      <RoleBlock />

      {/* BOTTOM LEFT — projects */}
      <Link href="/projects" className="block-bl nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-4">
          <p className="nav-item">MY</p>
          <p className="nav-item">PROJECTS</p>
        </div>
        <p className="nav-hint">6 FEATURED {'·'} ALL REPOS</p>
      </Link>

      {/* BOTTOM RIGHT — contact me page */}
      <Link href="/contact-me" className="block-br nav-text" style={{ textDecoration: "none" }}>
        <div className="home-enter home-enter-5">
          <p className="nav-item">CONTACT</p>
          <p className="nav-item">ME</p>
        </div>
        <p className="nav-hint">START A PROJECT BRIEF</p>
      </Link>

      <OpenStatus />

      {/* Visually hidden — crawlable content for search engines */}
      <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
        <h2>Zaka Ullah Waheed — Full-Stack Developer from Pakistan</h2>
        <p>{'Zaka Ullah Waheed is a Full-Stack Developer from Pakistan specialising in React, Next.js, Flutter, and QA Automation. Creator of QA with Zaka — a full-stack QA automation learning platform. Interned at Zong 5G. Building production-grade web apps, mobile apps, and automation tools since 2024. Open to remote work and freelance projects.'}</p>
        <p>Skills: React, Next.js, TypeScript, Flutter, Firebase, Three.js, WebGL, QA Automation, Selenium, n8n, REST APIs, Tailwind CSS.</p>
        <p>Projects: QA with Zaka, Zong Health Scanner, MomCare AI, Instagram Clone, Metro Mart, Docker web app.</p>
        <nav>
          <a href="/about">About Zaka Ullah Waheed</a>
          <a href="/projects">Projects by Zaka Ullah Waheed</a>
          <a href="/resume">Resume of Zaka Ullah Waheed</a>
          <a href="/contact-me">Contact Zaka Ullah Waheed</a>
        </nav>
      </div>
    </main>
  );
}
