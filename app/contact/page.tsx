"use client";

import React from "react";
import Link from "next/link";

/* ─── Nokia 3310 SVG ──────────────────────────────────────────── */
function NokiaSVG() {
  // Pixel art face on LCD screen
  // 1=skin(light green), 2=cap(dark), 3=feature(eyes/beard,very dark), 0=bg
  const pixels = [
    [0,0,2,2,2,2,2,2,2,0,0],
    [0,2,2,2,2,2,2,2,2,2,0],
    [2,2,2,2,2,2,2,2,2,2,2],
    [2,2,2,2,2,2,2,2,2,2,2],
    [0,0,1,1,1,1,1,1,1,0,0],
    [0,0,1,3,1,1,1,3,1,0,0],
    [0,0,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,3,1,3,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,0,0],
    [0,0,1,3,3,3,3,3,1,0,0],
    [0,0,1,3,1,1,1,3,1,0,0],
    [0,0,0,1,1,1,1,1,0,0,0],
  ];

  const colorMap: Record<number, string> = {
    1: "#7aaa65",   // skin
    2: "#1e3018",   // cap
    3: "#0e1a0c",   // features (eyes, beard)
  };

  const cellSize = 9;
  const startX = 50;
  const startY = 60;

  return (
    <svg viewBox="0 0 200 460" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: 240, height: "auto", display: "block" }}>

      {/* Phone body */}
      <rect x="15" y="8" width="170" height="444" rx="36" ry="36" fill="#1b1f3b" />
      {/* Inner body highlight */}
      <rect x="20" y="13" width="160" height="434" rx="32" ry="32" fill="#1e2245" />

      {/* Speaker grille */}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={75 + i*10} y={24} width={5} height={10} rx={2} fill="#111422" />
      ))}

      {/* Screen bezel */}
      <rect x="28" y="44" width="144" height="154" rx="10" ry="10" fill="#0d1020" />
      {/* LCD screen */}
      <rect x="34" y="50" width="132" height="142" rx="6" ry="6" fill="#4a6e3c" />

      {/* Screen scanlines for retro effect */}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={i} x="34" y={50 + i * 10} width="132" height="5"
          fill="rgba(0,0,0,0.04)" />
      ))}

      {/* "CALL ME" header text */}
      <rect x="44" y="52" width="112" height="18" fill="#3a5a2e" />
      <text x="100" y="65" textAnchor="middle"
        fontFamily="'Courier New', monospace" fontSize="10" fontWeight="bold"
        fill="#c8e8b0" letterSpacing="3">CALL ME</text>

      {/* Pixel art face */}
      {pixels.map((row, ri) =>
        row.map((cell, ci) =>
          cell !== 0 ? (
            <rect key={`${ri}-${ci}`}
              x={startX + ci * cellSize}
              y={startY + ri * cellSize}
              width={cellSize - 1}
              height={cellSize - 1}
              fill={colorMap[cell]}
            />
          ) : null
        )
      )}

      {/* NOKIA logo */}
      <text x="100" y="208" textAnchor="middle"
        fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="10"
        fontWeight="800" fill="#6a7ab0" letterSpacing="5">NOKIA</text>

      {/* Center nav pill */}
      <rect x="60" y="218" width="80" height="26" rx="13" fill="#151830" />
      <polygon points="78,231 86,225 86,237" fill="#6a7ab0" />
      <polygon points="122,231 114,225 114,237" fill="#6a7ab0" />
      <circle cx="100" cy="231" r="6" fill="#6a7ab0" />

      {/* Call button */}
      <rect x="28" y="252" width="60" height="28" rx="14" fill="#1a5c2e" />
      <text x="58" y="271" textAnchor="middle"
        fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#8de8aa">CALL</text>

      {/* End button */}
      <rect x="112" y="252" width="60" height="28" rx="14" fill="#5c1a1a" />
      <text x="142" y="271" textAnchor="middle"
        fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#e88a8a">END</text>

      {/* Number keys 1-9 */}
      {["1","2","3","4","5","6","7","8","9"].map((k, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <g key={k}>
            <circle cx={52 + col * 48} cy={298 + row * 44} r={18} fill="#151830" />
            <text x={52 + col * 48} y={303 + row * 44} textAnchor="middle"
              fontFamily="'Helvetica Neue', monospace" fontSize="13" fontWeight="bold"
              fill="#8890c8" dominantBaseline="middle">{k}</text>
          </g>
        );
      })}

      {/* Bottom row: * 0 # */}
      {["*","0","#"].map((k, i) => (
        <g key={k}>
          <circle cx={52 + i * 48} cy={430} r={18} fill="#151830" />
          <text x={52 + i * 48} y={435} textAnchor="middle"
            fontFamily="monospace" fontSize="13" fontWeight="bold"
            fill="#8890c8" dominantBaseline="middle">{k}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Contact row ─────────────────────────────────────────────── */
const rowText: React.CSSProperties = {
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  fontSize: "clamp(0.95rem, 1.5vw, 1.35rem)",
  fontWeight: 700, color: "var(--ink)",
  textDecoration: "none", display: "block", transition: "color 0.2s",
  cursor: "pointer",
};

function Row({ label, value, href, onClick }: {
  label: string; value: string; href?: string; onClick?: () => void;
}) {
  return (
    <div style={{ paddingBottom: "0.9rem", marginBottom: "0.9rem",
      borderBottom: "1px solid rgba(13,13,13,0.12)" }}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "clamp(0.5rem, 0.65vw, 0.62rem)", fontWeight: 600,
        letterSpacing: "0.18em", color: "var(--ink-50)",
        textTransform: "uppercase", marginBottom: "0.25rem" }}>
        {label}
      </p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={rowText}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-50)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ink)")}>
          {value}
        </a>
      ) : onClick ? (
        <span style={rowText} onClick={onClick}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-50)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ink)")}>
          {value}
        </span>
      ) : (
        <p style={{ ...rowText, cursor: "default" }}>{value}</p>
      )}
    </div>
  );
}

function CopyEmailRow() {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText("zakas2379@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ paddingBottom: "0.9rem", marginBottom: "0.9rem",
      borderBottom: "1px solid rgba(13,13,13,0.12)" }}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "clamp(0.5rem, 0.65vw, 0.62rem)", fontWeight: 600,
        letterSpacing: "0.18em", color: "var(--ink-50)",
        textTransform: "uppercase", marginBottom: "0.25rem" }}>
        EMAIL
      </p>
      <span style={{ ...rowText, display: "flex", alignItems: "center", gap: "0.8rem" }}
        onClick={copy}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-50)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--ink)")}>
        zakas2379@gmail.com
        <span style={{ fontSize: "clamp(0.5rem, 0.65vw, 0.6rem)", fontWeight: 500,
          letterSpacing: "0.14em", color: copied ? "#4a7a4a" : "var(--ink-50)",
          textTransform: "uppercase", transition: "color 0.3s" }}>
          {copied ? "COPIED!" : "CLICK TO COPY"}
        </span>
      </span>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function Contact() {
  return (
    <main style={{ width: "100vw", height: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "var(--paper)", overflow: "hidden" }}>

      {/* Window */}
      <div style={{ width: "min(92vw, 1080px)", height: "min(86vh, 660px)",
        border: "1px solid var(--ink)", display: "flex",
        flexDirection: "column", backgroundColor: "var(--paper)" }}>

        {/* Top bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", padding: "0 1.8rem",
          height: 54, borderBottom: "1px solid var(--ink)", flexShrink: 0 }}>

          {/* X button — left */}
          <div>
            <Link href="/"
              style={{ display: "inline-flex", alignItems: "center",
                justifyContent: "center", width: 34, height: 34,
                border: "1.5px solid var(--ink)", borderRadius: "50%",
                color: "var(--ink)", textDecoration: "none",
                fontSize: 20, lineHeight: 1, transition: "background 0.2s, color 0.2s" }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--ink)";
                e.currentTarget.style.color = "var(--paper)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--ink)";
              }}>
              ×
            </Link>
          </div>

          {/* Filename — center */}
          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)",
            color: "var(--ink-50)", letterSpacing: "0.05em" }}>
            call_me.jpg
          </span>

          {/* CONTACT label — right */}
          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)", fontWeight: 700,
            letterSpacing: "0.16em", color: "var(--ink)",
            textTransform: "uppercase", textAlign: "right" }}>
            CONTACT
          </span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Left — Nokia */}
          <div style={{ flex: "0 0 46%", borderRight: "1px solid var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.5rem" }}>
            <img src="/mobile.jpg" alt="Nokia 3310"
              style={{ maxHeight: "100%", maxWidth: "100%",
                objectFit: "contain", display: "block" }} />
          </div>

          {/* Right — details */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column",
            justifyContent: "center", padding: "1.5rem 2.5rem", overflow: "hidden" }}>

            <h1 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 900, fontSize: "clamp(2rem, 3.8vw, 3.2rem)",
              letterSpacing: "-0.03em", lineHeight: 0.9,
              color: "var(--ink)", textTransform: "uppercase",
              marginBottom: "0.5rem" }}>
              CONTACT ME
            </h1>
            <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: "clamp(0.5rem, 0.75vw, 0.68rem)", fontWeight: 500,
              letterSpacing: "0.18em", color: "var(--ink-50)",
              textTransform: "uppercase", marginBottom: "1.2rem" }}>
              LET'S TALK
            </p>

            <CopyEmailRow />
            <Row label="LINKEDIN"  value="Zaka Ullah Waheed"
              href="https://www.linkedin.com/in/zaka-ullah-waheed-80380832a" />
            <Row label="GITHUB"    value="github.com/zaka337"
              href="https://github.com/zaka337" />
            <Row label="INSTAGRAM" value="@notxzaka"
              href="https://www.instagram.com/notxzaka/" />
          </div>
        </div>
      </div>
    </main>
  );
}
