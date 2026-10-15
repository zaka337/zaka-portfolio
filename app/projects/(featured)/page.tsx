"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { PROJECTS, type Project } from "@/lib/projects";
import { useScrollUnlock, useChapterProgress, cv } from "@/lib/scrollStory";

/* Browser frame: captured screenshot, or a repo "terminal" for source-only projects. */
function Frame({ p }: { p: Project }) {
  const shown = (p.live ?? `github.com/zaka337/${p.repoName ?? ""}`).replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <Link className="pj-frame" href={`/projects/${p.slug}`} aria-label={`Read the ${p.title} case study`}>
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
    </Link>
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
      <div className="pj-pg" data-pg aria-hidden="true" />

      {/* Hero + index */}
      <section className="pj-hero">
        <p className="pj-label">{PROJECTS.length} projects {'—'} {liveCount} live</p>
        <h1 className="pj-hero-title">
          Things<br />I&apos;ve shipped.
        </h1>
        <ol className="pj-index">
          {PROJECTS.map((p, i) => (
            <li key={p.slug}>
              <a href={`#${p.slug}`}>
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
          key={p.slug}
          id={p.slug}
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
                  {p.chips.map((s) => <span className="pj-chip" key={s}>{s}</span>)}
                </div>
                <div className="pj-actions">
                  <Link className="pj-btn pj-btn-solid" href={`/projects/${p.slug}`}>
                    Read case study {'→'}
                  </Link>
                  {p.live && (
                    <a className="pj-btn pj-btn-ghost" href={p.live} target="_blank" rel="noopener noreferrer">
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
