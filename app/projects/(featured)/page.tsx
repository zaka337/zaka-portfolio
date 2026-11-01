"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { PROJECTS, type Project } from "@/lib/projects";
import { useScrollUnlock, cv } from "@/lib/scrollStory";
import { useReel } from "@/lib/reel";
import Reveal from "@/components/Reveal";

const N = PROJECTS.length;
const NO_JS_CSS =
  ".pj-reel{height:auto!important}.pj-stage{position:static!important;height:auto!important;overflow:visible!important;contain:none!important}" +
  ".pj-discs,.pj-mq,.pj-hud,.pj-ghost,.pj-fact,.pj-peek,.pj-cue{display:none!important}" +
  ".pj-slide{--o:0!important;position:relative!important;inset:auto!important;min-height:100vh;visibility:visible!important;pointer-events:auto!important;background:color-mix(in srgb,var(--bg) var(--tint-mix),var(--paper))}" +
  ".pj-slide .pj-w>span,.pj-up,.pj-device{transform:none!important}.pj-up,.pj-device{opacity:1!important}";
const clampN = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/* A title as words, each in its own mask, so it can rise into place word by word.
   The words stay real text separated by real spaces (screen readers and search engines read it as one title). */
function Words({ text, base = 0.04, step = 0.05 }: { text: string; base?: number; step?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="pj-w" style={cv({ "--d": base + i * step })}><span>{w}</span></span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </>
  );
}

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

/* One endless row of project names. The row moves with the page (scripted in lib/reel.ts) and drifts on its own
   (pure CSS, on the compositor); three copies so there is never a gap. */
function Marquee({ speed, className }: { speed: number; className: string }) {
  const group = (first: boolean) => (
    <span className="pj-mq-group" data-repeat={first ? "" : undefined}>
      {PROJECTS.map((p) => (
        <React.Fragment key={p.slug}>
          <span>{p.title}</span>
          <i className="pj-star" />
        </React.Fragment>
      ))}
    </span>
  );
  return (
    <div className={`pj-mq-row ${className}`} data-marquee data-speed={speed}>
      <div className="pj-mq-track">{group(true)}{group(false)}{group(false)}</div>
    </div>
  );
}

/* The list under the headline. A small picture of the project follows the pointer from row to row. */
function Index({ onPick }: { onPick: (i: number) => void }) {
  const peekRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const peek = peekRef.current;
    const list = listRef.current;
    if (!peek || !list) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = Array.from(peek.querySelectorAll<HTMLElement>("[data-card]"));
    let tx = 0, ty = 0, x = 0, y = 0, rot = 0, raf = 0, last = 0, placed = false;

    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      const k = 1 - Math.exp(-dt / 90);
      const px = x, py = y;
      x += (tx - x) * k;
      y += (ty - y) * k;
      rot += (clampN((x - px) * 0.9, -9, 9) - rot) * (1 - Math.exp(-dt / 140));
      peek.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 || Math.abs(rot) > 0.05) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const show = (i: number) => {
      cards.forEach((c, k) => c.toggleAttribute("data-on", k === i));
      peek.setAttribute("data-show", "");
    };
    const hide = () => peek.removeAttribute("data-show");
    const onMove = (e: PointerEvent) => {
      tx = e.clientX + 36;
      ty = e.clientY - 8;
      if (!placed) { x = tx; y = ty; placed = true; }
      wake();
    };
    const rows = Array.from(list.querySelectorAll<HTMLElement>("li"));
    const enters = rows.map((_, i) => () => show(i));
    rows.forEach((r, i) => r.addEventListener("pointerenter", enters[i]));
    list.addEventListener("pointermove", onMove, { passive: true });
    list.addEventListener("pointerleave", () => { hide(); placed = false; });
    return () => {
      rows.forEach((r, i) => r.removeEventListener("pointerenter", enters[i]));
      list.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <ol className="pj-index" ref={listRef}>
        {PROJECTS.map((p, i) => (
          <li key={p.slug} style={cv({ "--d": 0.5 + i * 0.07 })}>
            <a href={`#${p.slug}`} onClick={(e) => { e.preventDefault(); onPick(i); }}>
              <span className="n">0{i + 1}</span>
              <span className="t">{p.title}</span>
              <span className={`k ${p.live ? "pj-live-dot" : ""}`}>{p.live ? "Live" : p.language}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="pj-peek" ref={peekRef} aria-hidden="true">
        {PROJECTS.map((p) => (
          <div className="pj-peek-card" data-card key={p.slug} style={cv({ "--bg": p.bg })}>
            {p.shot ? (
              <Image src={p.shot} alt="" width={640} height={400} sizes="340px" draggable={false} />
            ) : (
              <div className="pj-peek-term">
                <span>{p.title}</span>
                <em>{p.language}</em>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default function Projects() {
  useScrollUnlock();
  const rootRef = useRef<HTMLElement>(null);
  const { goTo, toTop } = useReel(rootRef, N);

  const liveCount = PROJECTS.filter((p) => p.live).length;

  return (
    <main ref={rootRef} className="pj-root">
      {/* Without JavaScript the pinned show cannot move, so lay the projects out one under another (same as reduced motion) */}
      <noscript><style>{NO_JS_CSS}</style></noscript>
      <div className="pj-nav">
        <Link href="/">{'←'} Back.</Link>
        <span>Selected work</span>
        <Link href="/projects/all">All repos {'↗'}</Link>
      </div>
      <div className="pj-pg" data-pg aria-hidden="true" />

      {/* Hero + index */}
      <section className="pj-hero">
        <p className="pj-label pj-hero-label">{N} projects {'—'} {liveCount} live</p>
        <h1 className="pj-hero-title">
          <Words text="Things" base={0.05} /><br />
          <Words text="I've shipped." base={0.16} />
        </h1>
        <Index onPick={goTo} />
        <div className="pj-cue" aria-hidden="true"><span>Scroll</span><i /></div>
      </section>

      {/* The reel: one pinned stage, one project after another, no gaps between them */}
      <div className="pj-reel" data-reel style={cv({ "--n": N })}>
        <div className="pj-stage">
          <div className="pj-discs" aria-hidden="true">
            {PROJECTS.map((p) => (
              <div key={p.slug} className="pj-disc" data-disc style={cv({ "--bg": p.bg })} />
            ))}
          </div>

          <div className="pj-mq" aria-hidden="true">
            <Marquee speed={0.34} className="pj-mq-a" />
            <Marquee speed={-0.26} className="pj-mq-b" />
          </div>

          {PROJECTS.map((p, i) => (
            <article
              key={p.slug}
              id={p.slug}
              className="pj-slide"
              data-slide
              data-slug={p.slug}
              data-state={i === 0 ? "active" : "off"}
              style={cv({ "--bg": p.bg })}
            >
              <span className="pj-ghost" aria-hidden="true">0{i + 1}</span>
              <div className="pj-grid">
                <div className="pj-text">
                  <p className="pj-label pj-kind pj-up" style={cv({ "--d": 0.02 })}>
                    0{i + 1} / 0{N} {'—'} {p.kind} {'—'} {p.year}
                  </p>
                  <h2 className="pj-title"><Words text={p.title} base={0.05} /></h2>
                  <p className="pj-pitch pj-up" style={cv({ "--d": 0.2 })}>{p.pitch}</p>
                  <ul className="pj-points pj-up" style={cv({ "--d": 0.25 })}>
                    {p.points.map((pt) => <li key={pt}>{pt}</li>)}
                  </ul>
                  <div className="pj-chips pj-up" style={cv({ "--d": 0.29 })}>
                    {p.chips.map((s) => <span className="pj-chip" key={s}>{s}</span>)}
                  </div>
                  <div className="pj-actions pj-up" style={cv({ "--d": 0.33 })}>
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

                <div className="pj-visual">
                  <div className="pj-device" data-tilt>
                    <div className="pj-float"><Frame p={p} /></div>
                  </div>
                  {p.facts.slice(0, 3).map((f, k) => (
                    <div className={`pj-fact pj-fact-${k + 1}`} key={f.label} style={cv({ "--k": 1.12 + k * 0.24 })} aria-hidden="true">
                      <b>{f.value}</b>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}

          <div className="pj-hud">
            <div className="pj-count" data-counter style={cv({ "--cur": 0 })} aria-hidden="true">
              <span className="pj-count-win pj-count-num">
                <span className="pj-count-strip">
                  {PROJECTS.map((p, i) => <span key={p.slug}>0{i + 1}</span>)}
                </span>
              </span>
              <span className="pj-count-of">/ 0{N}</span>
              <span className="pj-count-win pj-count-name">
                <span className="pj-count-strip">
                  {PROJECTS.map((p) => <span key={p.slug}>{p.title}</span>)}
                </span>
              </span>
            </div>

            <nav className="pj-rail" data-rail data-active="0" aria-label="Jump to a project">
              {PROJECTS.map((p, i) => (
                <button key={p.slug} type="button" className="pj-rail-btn" onClick={() => goTo(i)} aria-label={`Go to ${p.title}`}>
                  <span className="pj-rail-name">{p.title}</span>
                  <span className="pj-rail-dot" />
                </button>
              ))}
            </nav>

            <div className="pj-hint" aria-hidden="true"><span>Keep scrolling</span><i /></div>
          </div>
        </div>
      </div>

      {/* A game, playable in the browser */}
      <section className="pj-game" aria-labelledby="pj-game-h">
        <Reveal distance={44} duration={900}>
          <Link className="pj-game-card" href="/mini-mayhem" aria-label="Play MINI MAYHEM, a 3D racing game built into this portfolio">
            <Image className="pj-game-img" src="/mini-mayhem-preview.jpg" alt="" width={1200} height={630} sizes="(max-width: 900px) 92vw, 54vw" draggable={false} />
            <div className="pj-game-text">
              <p className="pj-label">Playable in your browser</p>
              <h2 id="pj-game-h">MINI MAYHEM</h2>
              <p className="pj-game-tag">Tiny cars. Massive egos.</p>
              <p className="pj-game-copy">A 3D racing game I built into this portfolio: four drivers with giant cartoon heads, three laps, one island with a long bridge and a military base. Keyboard or touch.</p>
              <span className="pj-btn pj-btn-solid">Play now {'→'}</span>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="pj-cta">
        <Reveal><p className="pj-label">That&apos;s the highlight reel</p></Reveal>
        <Reveal delay={80} distance={36}><h2>There&apos;s more<br />on GitHub.</h2></Reveal>
        <Reveal delay={160}>
          <div className="pj-actions" style={{ justifyContent: "center" }}>
            <Link className="pj-btn pj-btn-solid" href="/projects/all">Explore all repos in 3D</Link>
            <Link className="pj-btn pj-btn-ghost" href="/contact">Say hi</Link>
            <button type="button" className="pj-btn pj-btn-ghost" onClick={toTop}>Run it again {'↻'}</button>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
