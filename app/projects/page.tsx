"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ─── Types ───────────────────────────────────────────────────── */
interface Repo {
  id: number;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  html_url: string;
  stargazers_count: number;
  topics: string[];
}

/* ─── Friendly names & descriptions for known repos ─────────── */
const META: Record<string, { title: string; desc: string }> = {
  "QA_with_ZAKA":                { title: "QA WITH ZAKA",          desc: "AI-powered Q&A platform with smart response system" },
  "Zong-health-scanner":         { title: "ZONG HEALTH SCANNER",   desc: "Telecom health diagnostics scanner interface" },
  "momcare-ai-backend":          { title: "MOMCARE AI",             desc: "AI backend service for maternal care assistance" },
  "ECOMMERCE-PLATFORM":          { title: "ECOMMERCE PLATFORM",     desc: "Cross-platform mobile e-commerce app built with Flutter" },
  "my-store":                    { title: "MY STORE",               desc: "Full-featured online storefront with cart & checkout" },
  "Instagram_Clone":             { title: "INSTAGRAM CLONE",        desc: "Feature-rich Instagram clone with feed & stories" },
  "ecommerce-fullstack-design.": { title: "FULLSTACK ECOMMERCE",    desc: "Full-stack e-commerce with modern UI design" },
  "my-portfolio":                { title: "OLD PORTFOLIO",          desc: "Previous personal portfolio website" },
  "Metro-Mart":                  { title: "METRO MART",             desc: "E-commerce web app — Web Lab final project" },
  "My-Calculator":               { title: "CALCULATOR",             desc: "Clean, minimal calculator web app" },
  "DockerTesting":               { title: "DOCKER APP",             desc: "Containerized web application with Docker" },
  "devOps-t5":                   { title: "DEVOPS T5",              desc: "DevOps pipeline and infrastructure project" },
  "testAWS":                     { title: "AWS DEPLOY",             desc: "TypeScript app deployed on AWS infrastructure" },
  "aws-elastic-beanstalk-express-js-sample": { title: "AWS BEANSTALK", desc: "Express.js app on AWS Elastic Beanstalk" },
};

/* ─── Palette for cards ───────────────────────────────────────── */
const COLORS = [
  { bg: "#d4c9b0", ink: "#0d0d0d" },
  { bg: "#c9d4b0", ink: "#1a3a1a" },
  { bg: "#b0c9d4", ink: "#0d2a3a" },
  { bg: "#d4b0c9", ink: "#3a0d2a" },
  { bg: "#d4d0b0", ink: "#3a360d" },
  { bg: "#c4b0d4", ink: "#280d3a" },
  { bg: "#b0d4c4", ink: "#0d3a28" },
  { bg: "#d4bab0", ink: "#3a1a0d" },
  { bg: "#b0b4d4", ink: "#0d1040" },
  { bg: "#d4c4b0", ink: "#3a2a0d" },
  { bg: "#b4d4b0", ink: "#103a10" },
  { bg: "#d4b0b0", ink: "#3a0d0d" },
];

/* ─── Scatter positions for up to 14 cards ───────────────────── */
const POSITIONS = [
  { x: "3%",  y: "11%", r: -4, s: 1.05 },
  { x: "22%", y: "7%",  r:  3, s: 0.92 },
  { x: "42%", y: "10%", r: -2, s: 1.0  },
  { x: "63%", y: "7%",  r:  5, s: 0.88 },
  { x: "80%", y: "13%", r: -3, s: 1.02 },
  { x: "5%",  y: "50%", r:  6, s: 0.95 },
  { x: "24%", y: "54%", r: -5, s: 1.0  },
  { x: "46%", y: "50%", r:  2, s: 0.9  },
  { x: "66%", y: "53%", r: -4, s: 1.04 },
  { x: "84%", y: "50%", r:  4, s: 0.93 },
  { x: "10%", y: "76%", r: -3, s: 0.97 },
  { x: "35%", y: "78%", r:  5, s: 1.01 },
  { x: "58%", y: "76%", r: -6, s: 0.91 },
  { x: "78%", y: "79%", r:  3, s: 1.03 },
];

/* ─── Single card ─────────────────────────────────────────────── */
function Card({ repo, idx }: { repo: Repo; idx: number }) {
  const pos  = POSITIONS[idx % POSITIONS.length];
  const col  = COLORS[idx % COLORS.length];
  const meta = META[repo.name];
  const title = meta?.title ?? repo.name.replace(/-/g, " ").toUpperCase();
  const desc  = meta?.desc  ?? repo.description ?? "Frontend project";
  const live  = repo.homepage && repo.homepage.startsWith("http") ? repo.homepage : null;

  return (
    <a
      href={live ?? repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "absolute",
        left: pos.x, top: pos.y,
        width: 172,
        transform: `rotate(${pos.r}deg) scale(${pos.s})`,
        transformOrigin: "center center",
        textDecoration: "none",
        opacity: 0.72,
        transition: "opacity 0.25s ease, transform 0.25s ease",
        zIndex: 1,
        cursor: "pointer",
        display: "block",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = "1";
        el.style.transform = `rotate(${pos.r * 0.2}deg) scale(${pos.s * 1.08})`;
        el.style.zIndex = "10";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = "0.72";
        el.style.transform = `rotate(${pos.r}deg) scale(${pos.s})`;
        el.style.zIndex = "1";
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: "100%", height: 118,
        backgroundColor: col.bg,
        borderRadius: 3,
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "space-between",
        padding: "10px 10px 8px",
        border: "1px solid rgba(0,0,0,0.08)",
        marginBottom: 7,
        position: "relative", overflow: "hidden",
      }}>
        {/* Language pill */}
        {repo.language && (
          <span style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
            color: col.ink, opacity: 0.55, textTransform: "uppercase",
            background: `rgba(0,0,0,0.08)`, padding: "2px 6px", borderRadius: 2,
          }}>
            {repo.language}
          </span>
        )}
        {/* Live badge */}
        {live && (
          <span style={{
            position: "absolute", top: 8, right: 8,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 7, fontWeight: 700, letterSpacing: "0.1em",
            color: "#1a5c2e", background: "rgba(26,92,46,0.12)",
            padding: "2px 5px", borderRadius: 2, textTransform: "uppercase",
          }}>
            LIVE ↗
          </span>
        )}
        {/* Big number watermark */}
        <span style={{
          position: "absolute", bottom: -8, right: 4,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 64, fontWeight: 900, color: col.ink,
          opacity: 0.08, userSelect: "none", lineHeight: 1,
        }}>
          {String(idx + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "0 1px" }}>
        <p style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 11, fontWeight: 800, color: "var(--ink)",
          textTransform: "uppercase", letterSpacing: "-0.01em",
          lineHeight: 1.1, marginBottom: 4,
        }}>
          {title}
        </p>
        <p style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 9.5, fontWeight: 400, color: "var(--ink-70)",
          lineHeight: 1.4,
        }}>
          {desc}
        </p>
      </div>
    </a>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function Projects() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/zaka337/repos?sort=updated&per_page=100")
      .then(r => r.json())
      .then((data: Repo[]) => {
        // Only show repos with actual code (have a language)
        const filtered = data.filter(r => r.language !== null);
        setRepos(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main style={{
      position: "relative", width: "100vw", height: "100vh",
      overflow: "hidden", backgroundColor: "var(--paper)",
    }}>
      {/* Back */}
      <Link href="/" style={{
        position: "absolute", top: "4vh", left: "4vw", zIndex: 100,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)", fontWeight: 600,
        letterSpacing: "0.12em", color: "var(--ink-50)",
        textDecoration: "none", textTransform: "uppercase",
        transition: "color 0.2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-50)")}>
        ← BACK.
      </Link>

      {/* Center label */}
      <span style={{
        position: "absolute", top: "4vh", left: "50%",
        transform: "translateX(-50%)", zIndex: 100,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)", fontWeight: 500,
        letterSpacing: "0.12em", color: "var(--ink-50)",
        textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        my_projects — github/zaka337
      </span>

      {/* Loading */}
      {loading && (
        <p style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "clamp(0.7rem, 1vw, 0.85rem)", fontWeight: 500,
          letterSpacing: "0.14em", color: "var(--ink-50)",
          textTransform: "uppercase",
        }}>
          FETCHING REPOS...
        </p>
      )}

      {/* Cards */}
      {repos.map((repo, i) => (
        <Card key={repo.id} repo={repo} idx={i} />
      ))}
    </main>
  );
}
