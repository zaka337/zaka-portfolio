"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── Scramble animation ────────────────────────────────────────── */
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function scrambleChar(c: string): string {
  if (" .'/@&-".includes(c)) return c;
  return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [out, setOut] = useState(() => text.split("").map(scrambleChar).join(""));
  const rafRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      const DURATION = 680;

      const tick = (now: number) => {
        const progress = Math.min((now - start) / DURATION, 1);
        const resolved = Math.floor(progress * text.length);
        setOut(
          text.slice(0, resolved) +
          text.slice(resolved).split("").map(scrambleChar).join("")
        );
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [text, delay]);

  return <>{out}</>;
}

/* ─── Marquee strip ─────────────────────────────────────────────── */
const TAPE = "AVAILABLE FOR WORK · BASED IN PAKISTAN · OPEN TO REMOTE · FULL-STACK DEVELOPER · QA AUTOMATION · REACT & NEXT.JS · FLUTTER BUILDER · ";

/* ─── Contact rows ──────────────────────────────────────────────── */
const ROWS = [
  {
    label: "EMAIL",
    display: "ZAKAS2379@GMAIL.COM",
    action: "copy" as const,
  },
  {
    label: "LINKEDIN",
    display: "ZAKA ULLAH WAHEED",
    href: "https://www.linkedin.com/in/zaka-ullah-waheed-80380832a",
  },
  {
    label: "GITHUB",
    display: "GITHUB.COM/ZAKA337",
    href: "https://github.com/zaka337",
  },
  {
    label: "INSTAGRAM",
    display: "@NOTXZAKA",
    href: "https://www.instagram.com/notxzaka/",
  },
];

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Contact() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText("zakas2379@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <main style={{
      width: "100vw",
      minHeight: "100dvh",
      backgroundColor: "var(--paper)",
      color: "var(--ink)",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      overflowX: "hidden",
      overflowY: "auto",
    }}>

      <style>{`
        @keyframes tape {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .tape-inner {
          display: flex;
          white-space: nowrap;
          will-change: transform;
          animation: tape 28s linear infinite;
        }
        @media (max-width: 640px) {
          .row-label { display: none !important; }
          .row-value { font-size: clamp(1.1rem, 5.8vw, 2rem) !important; }
          .hero-h1   { font-size: clamp(4.2rem, 22vw, 9rem) !important; }
        }
      `}</style>

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 clamp(20px, 5vw, 64px)",
        height: 52,
        borderBottom: "1px solid var(--ink)",
        backgroundColor: "var(--paper)",
      }}>
        <Link href="/" style={{
          fontSize: "clamp(0.52rem, 0.78vw, 0.68rem)", fontWeight: 600,
          letterSpacing: "0.16em", color: "var(--ink-50)",
          textDecoration: "none", textTransform: "uppercase",
          transition: "color 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-50)")}>
          {'←'} BACK
        </Link>

        <span style={{
          fontSize: "clamp(0.52rem, 0.78vw, 0.68rem)", fontWeight: 500,
          letterSpacing: "0.18em", color: "var(--ink-50)",
          textTransform: "uppercase",
        }}>
          CONTACT
        </span>

        <span style={{
          fontSize: "clamp(0.52rem, 0.78vw, 0.68rem)", fontWeight: 500,
          letterSpacing: "0.14em", color: "var(--ink-50)",
          textTransform: "uppercase", textAlign: "right",
        }}>
          OPEN FOR WORK
        </span>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header style={{
        padding: "clamp(40px, 8vh, 100px) clamp(20px, 5vw, 64px) clamp(32px, 5.5vh, 72px)",
        borderBottom: "1px solid var(--ink)",
      }}>
        <p style={{
          fontSize: "clamp(0.48rem, 0.7vw, 0.6rem)", fontWeight: 600,
          letterSpacing: "0.24em", color: "var(--ink-50)",
          textTransform: "uppercase",
          marginBottom: "clamp(14px, 2.8vh, 30px)",
        }}>
          ZAKA ULLAH WAHEED — FULL-STACK DEVELOPER
        </p>

        <h1 className="hero-h1" style={{
          fontWeight: 900,
          fontSize: "clamp(4.5rem, 17vw, 19rem)",
          lineHeight: 0.85,
          letterSpacing: "-0.035em",
          textTransform: "uppercase",
          color: "var(--ink)",
          margin: 0,
        }}>
          <ScrambleText text={"LET'S"} delay={80} /><br />
          <ScrambleText text="WORK." delay={200} />
        </h1>
      </header>

      {/* ── Availability tape ────────────────────────────────── */}
      <div style={{
        overflow: "hidden",
        borderBottom: "1px solid var(--ink)",
        padding: "9px 0",
        fontSize: "clamp(0.46rem, 0.62vw, 0.56rem)", fontWeight: 600,
        letterSpacing: "0.24em", color: "var(--ink-50)",
        textTransform: "uppercase",
        userSelect: "none",
      }}>
        <div className="tape-inner">
          <span>{TAPE}</span><span>{TAPE}</span>
        </div>
      </div>

      {/* ── Contact rows ─────────────────────────────────────── */}
      <section>
        {ROWS.map((row, i) => {
          const on = hovered === i;
          const isEmail = row.action === "copy";

          const inner = (
            <div
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={isEmail ? copy : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "clamp(12px, 3vw, 32px)",
                padding: "clamp(18px, 3.8vh, 36px) clamp(20px, 5vw, 64px)",
                borderBottom: "1px solid var(--ink)",
                backgroundColor: on ? "var(--ink)" : "transparent",
                color: on ? "var(--paper)" : "var(--ink)",
                transition: "background-color 0.15s, color 0.15s",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              {/* Label */}
              <span className="row-label" style={{
                flexShrink: 0,
                width: "clamp(56px, 7vw, 110px)",
                fontSize: "clamp(0.46rem, 0.68vw, 0.58rem)",
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: on ? "rgba(241,237,226,0.42)" : "var(--ink-50)",
                transition: "color 0.15s",
              }}>
                {row.label}
              </span>

              {/* Value */}
              <span className="row-value" style={{
                flex: 1,
                fontWeight: 800,
                fontSize: "clamp(1.3rem, 3.8vw, 5rem)",
                letterSpacing: "-0.025em",
                lineHeight: 1,
                textTransform: "uppercase",
                transition: "color 0.15s",
              }}>
                {isEmail && copied ? "COPIED!" : row.display}
              </span>

              {/* Arrow */}
              <span style={{
                flexShrink: 0,
                fontSize: "clamp(1.1rem, 3.2vw, 4rem)",
                fontWeight: 300,
                lineHeight: 1,
                opacity: on ? 1 : 0.14,
                transform: on ? "translate(8px,-8px)" : "translate(0,0)",
                transition: "opacity 0.15s, transform 0.15s",
              }}>
                {'↗'}
              </span>
            </div>
          );

          return row.href ? (
            <a key={i} href={row.href} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
        padding: "clamp(14px, 2.4vh, 20px) clamp(20px, 5vw, 64px)",
      }}>
        <span style={{
          fontSize: "clamp(0.46rem, 0.6vw, 0.54rem)", fontWeight: 400,
          letterSpacing: "0.14em", color: "var(--ink-50)",
          textTransform: "uppercase",
        }}>
          {'© 2025 — ZAKA ULLAH WAHEED'}
        </span>
        <span style={{
          fontSize: "clamp(0.46rem, 0.6vw, 0.54rem)", fontWeight: 400,
          letterSpacing: "0.14em", color: "var(--ink-50)",
          textTransform: "uppercase",
        }}>
          BASED IN PAKISTAN
        </span>
      </footer>
    </main>
  );
}
