"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE_URL } from "@/lib/site";
import { useScrollUnlock, useChapterProgress, cv } from "@/lib/scrollStory";

interface Project {
  id: string;
  title: string;
  kind: string;
  year: string;
  pitch: string;
  points: string[];
  stack: string[];
  bg: string;
  live?: string;
  repo?: string;
  repoName?: string;
  language?: string;
  shot?: string; // captured screenshot shown in the frame
}

const GH = "https://github.com/zaka337";

const PROJECTS: Project[] = [
  {
    id: "qa-with-zaka",
    title: "QA with Zaka",
    kind: "AI-powered education platform",
    year: "2026",
    pitch: "A full-stack educational QA platform, built and shipped end to end.",
    points: ["Automated testing built into the product", "Real-time Q&A", "Production-grade web architecture"],
    stack: ["React", "Next.js", "Firebase", "TypeScript"],
    bg: "#d4c9b0",
    live: "https://qa-with-zaka-4pc9.vercel.app/",
    repo: `${GH}/QA_with_ZAKA`,
    repoName: "QA_with_ZAKA",
    language: "TypeScript",
    shot: "/projects/qa-with-zaka.jpg",
  },
  {
    id: "zong-health-scanner",
    title: "Zong Health Scanner",
    kind: "Automation / internship",
    year: "2026",
    pitch: "An n8n-powered website health scanner, built during my QA Automation internship at Zong 5G.",
    points: ["Orchestrated with n8n workflows", "Telecom health diagnostics"],
    stack: ["n8n", "JavaScript", "QA Automation"],
    bg: "#b0c9d4",
    repo: `${GH}/Zong-health-scanner`,
    repoName: "Zong-health-scanner",
    language: "JavaScript",
  },
  {
    id: "momcare-ai",
    title: "MomCare AI",
    kind: "AI backend",
    year: "2026",
    pitch: "The AI backend for a maternal care app.",
    points: ["Python AI backend", "Maternal care use case"],
    stack: ["Python", "AI"],
    bg: "#d4b0c9",
    repo: `${GH}/momcare-ai-backend`,
    repoName: "momcare-ai-backend",
    language: "Python",
  },
  {
    id: "glamourhub",
    title: "GlamourHub",
    kind: "E-commerce web app",
    year: "2024",
    pitch: "A premium e-commerce web app for the Pakistani market.",
    points: ["Premium storefront experience", "Built for Pakistani shoppers", "Live on Netlify"],
    stack: ["E-commerce", "Web", "Netlify"],
    bg: "#c9d4b0",
    live: "https://glamourhubpk.netlify.app/",
    shot: "/projects/glamourhub.jpg",
  },
  {
    id: "bazaarbox",
    title: "BazaarBox",
    kind: "Mobile e-commerce app",
    year: "2024",
    pitch: "A cross-platform e-commerce app built in Flutter.",
    points: ["Firebase authentication", "Real-time sync", "One codebase for mobile"],
    stack: ["Flutter", "Dart", "Firebase"],
    bg: "#d4d0b0",
    repo: `${GH}/ECOMMERCE-PLATFORM`,
    repoName: "ECOMMERCE-PLATFORM",
    language: "Dart",
  },
  {
    id: "portfolio",
    title: "This Portfolio",
    kind: "3D interactive portfolio",
    year: "2026",
    pitch: "The 3D portfolio you are standing inside.",
    points: ["Cursor-tracking WebGL avatar", "Floating 3D project carousel", "Scroll-animated pages"],
    stack: ["Next.js", "React", "Three.js", "TypeScript"],
    bg: "#c4b0d4",
    live: SITE_URL,
    repo: `${GH}/zaka-portfolio`,
    repoName: "zaka-portfolio",
    language: "TypeScript",
    shot: "/projects/portfolio.jpg",
  },
];

/* Browser frame: captured screenshot, or a repo "terminal" for source-only projects. */
function Frame({ p }: { p: Project }) {
  const href = p.live ?? p.repo ?? GH;
  const shown = (p.live ?? `github.com/zaka337/${p.repoName ?? ""}`).replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <a className="pj-frame" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.title}`}>
      <div className="pj-bar" aria-hidden="true">
        <i /><i /><i />
        <span className="pj-url">{shown}</span>
      </div>
      <div className="pj-viewport">
        {p.shot ? (
          <Image
            src={p.shot}
            alt={`${p.title} screenshot`}
            width={1280}
            height={800}
            sizes="(max-width: 900px) 92vw, 54vw"
            draggable={false}
          />
        ) : (
          <div className="pj-term" aria-hidden="true">
            <span className="dim">$ git clone github.com/zaka337/{p.repoName}</span>
            <span>language&nbsp;&nbsp;&nbsp;{p.language}</span>
            <span>status&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{p.live ? "live + source" : "source on GitHub"}</span>
            <span className="big">{p.title}<i className="pj-caret" /></span>
          </div>
        )}
      </div>
    </a>
  );
}

export default function Projects() {
  useScrollUnlock();
  const rootRef = useRef<HTMLElement>(null);
  useChapterProgress(rootRef);

  const liveCount = PROJECTS.filter((p) => p.live).length;

  return (
    <main ref={rootRef} className="pj-root">
      <div className="pj-nav">
        <Link href="/">{'←'} Back.</Link>
        <span>Selected work</span>
        <Link href="/projects/all">All repos {'↗'}</Link>
      </div>
      <div className="pj-pg" aria-hidden="true" />

      {/* Hero + index */}
      <section className="pj-hero">
        <p className="pj-label">{PROJECTS.length} projects {'—'} {liveCount} live</p>
        <h1 className="pj-hero-title">
          Things<br />I&apos;ve shipped.
        </h1>
        <ol className="pj-index">
          {PROJECTS.map((p, i) => (
            <li key={p.id}>
              <a href={`#${p.id}`}>
                <span className="n">0{i + 1}</span>
                <span className="t">{p.title}</span>
                <span className={`k ${p.live ? "pj-live-dot" : ""}`}>{p.live ? "Live" : p.language}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {/* One chapter per project */}
      {PROJECTS.map((p, i) => (
        <section
          key={p.id}
          id={p.id}
          className="pj-chapter"
          data-chapter
          style={cv({ "--bg": p.bg })}
        >
          <div className="pj-sticky">
            <span className="pj-ghost" aria-hidden="true">0{i + 1}</span>
            <div className="pj-grid">
              <div className="pj-text">
                <p className="pj-label pj-kind">
                  0{i + 1} / 0{PROJECTS.length} {'—'} {p.kind} {'—'} {p.year}
                </p>
                <h2 className="pj-title">{p.title}</h2>
                <p className="pj-pitch">{p.pitch}</p>
                <ul className="pj-points">
                  {p.points.map((pt) => <li key={pt}>{pt}</li>)}
                </ul>
                <div className="pj-chips">
                  {p.stack.map((s) => <span className="pj-chip" key={s}>{s}</span>)}
                </div>
                <div className="pj-actions">
                  {p.live && (
                    <a className="pj-btn pj-btn-solid" href={p.live} target="_blank" rel="noopener noreferrer">
                      Visit live {'↗'}
                    </a>
                  )}
                  {p.repo && (
                    <a className="pj-btn pj-btn-ghost" href={p.repo} target="_blank" rel="noopener noreferrer">
                      Source {'↗'}
                    </a>
                  )}
                </div>
              </div>
              <Frame p={p} />
            </div>
            <div className="pj-prog" aria-hidden="true">
              <span><em>0{i + 1}</em></span>
              <i><b /></i>
              <span>0{PROJECTS.length}</span>
            </div>
          </div>
        </section>
      ))}

      {/* Closing */}
      <section className="pj-cta">
        <p className="pj-label">That&apos;s the highlight reel</p>
        <h2>There&apos;s more<br />on GitHub.</h2>
        <div className="pj-actions" style={{ justifyContent: "center" }}>
          <Link className="pj-btn pj-btn-solid" href="/projects/all">Explore all repos in 3D</Link>
          <Link className="pj-btn pj-btn-ghost" href="/contact">Say hi</Link>
        </div>
      </section>
    </main>
  );
}
