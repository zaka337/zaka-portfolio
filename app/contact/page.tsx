"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

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
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(timerRef.current); }, []);
  const copy = () => {
    navigator.clipboard.writeText("zakas2379@gmail.com");
    clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
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
    <main style={{ width: "100vw", minHeight: "100dvh", display: "flex",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "var(--paper)", overflow: "auto",
      padding: "clamp(12px, 3vh, 32px) clamp(12px, 4vw, 32px)" }}>

      <style>{`
        @media (max-width: 640px) {
          .contact-window {
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
          }
          .contact-body {
            flex-direction: column !important;
            overflow: visible !important;
          }
          .contact-nokia {
            flex: none !important;
            width: 100% !important;
            max-height: none !important;
            border-right: none !important;
            border-bottom: 1px solid var(--ink) !important;
            padding: 1.5rem !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          .contact-nokia img {
            width: clamp(200px, 56vw, 300px) !important;
            height: auto !important;
            max-height: none !important;
            max-width: none !important;
            aspect-ratio: auto !important;
          }
          .contact-details {
            padding: 1.2rem 1.4rem !important;
            overflow: visible !important;
          }
          .contact-details h1 {
            font-size: clamp(1.6rem, 8vw, 2.6rem) !important;
          }
        }
      `}</style>

      {/* Window */}
      <div className="contact-window" style={{
        width: "min(92vw, 1080px)", height: "min(86vh, 660px)",
        border: "1px solid var(--ink)", display: "flex",
        flexDirection: "column", backgroundColor: "var(--paper)" }}>

        {/* Top bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", padding: "0 1.2rem",
          height: 54, borderBottom: "1px solid var(--ink)", flexShrink: 0 }}>

          <div>
            <Link href="/"
              style={{ display: "inline-flex", alignItems: "center",
                justifyContent: "center", width: 34, height: 34,
                border: "1.5px solid var(--ink)", borderRadius: "50%",
                color: "var(--ink)", textDecoration: "none",
                fontSize: 20, lineHeight: 1, transition: "background 0.2s, color 0.2s",
                touchAction: "manipulation" }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--ink)";
                e.currentTarget.style.color = "var(--paper)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--ink)";
              }}>
              {'×'}
            </Link>
          </div>

          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)",
            color: "var(--ink-50)", letterSpacing: "0.05em" }}>
            call_me.jpg
          </span>

          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)", fontWeight: 700,
            letterSpacing: "0.16em", color: "var(--ink)",
            textTransform: "uppercase", textAlign: "right" }}>
            CONTACT
          </span>
        </div>

        {/* Body */}
        <div className="contact-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Left — Nokia image */}
          <div className="contact-nokia" style={{ flex: "0 0 46%", borderRight: "1px solid var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.5rem" }}>
            <Image src="/mobile.jpg" alt="Nokia 3310"
              width={1024} height={1024} priority
              style={{ maxHeight: "100%", maxWidth: "100%",
                objectFit: "contain", display: "block", width: "auto", height: "auto" }} />
          </div>

          {/* Right — contact details */}
          <div className="contact-details" style={{ flex: 1, display: "flex", flexDirection: "column",
            justifyContent: "center", padding: "1.5rem 2.5rem", overflow: "hidden" }}>

            <h1 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 900, fontSize: "clamp(1.8rem, 3.8vw, 3.2rem)",
              letterSpacing: "-0.03em", lineHeight: 0.9,
              color: "var(--ink)", textTransform: "uppercase",
              marginBottom: "0.5rem" }}>
              CONTACT ME
            </h1>
            <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: "clamp(0.5rem, 0.75vw, 0.68rem)", fontWeight: 500,
              letterSpacing: "0.18em", color: "var(--ink-50)",
              textTransform: "uppercase", marginBottom: "1.2rem" }}>
              LET&apos;S TALK
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
