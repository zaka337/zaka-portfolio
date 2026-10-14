"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useScrollUnlock, useChapterProgress, cv } from "@/lib/scrollStory";

/* ─── Hero text effects ─────────────────────────────────────────── */

function Typewriter({ phrases, speed = 72, pause = 2200 }: {
  phrases: string[];
  speed?: number;
  pause?: number;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timerId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = phrases[phraseIdx];

      if (!deleting && charIdx === current.length) {
        timerId = setTimeout(() => { deleting = true; tick(); }, pause);
        return;
      }
      if (deleting && charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        timerId = setTimeout(tick, speed);
        return;
      }

      charIdx += deleting ? -1 : 1;
      el.textContent = phrases[phraseIdx].slice(0, charIdx);
      timerId = setTimeout(tick, deleting ? speed * 0.5 : speed);
    };

    timerId = setTimeout(tick, speed);
    return () => clearTimeout(timerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={spanRef} />;
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function scrambleChar(c: string): string {
  if (" .'/@&-.".includes(c)) return c;
  return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    el.textContent = text.split("").map(scrambleChar).join("");

    const timer = setTimeout(() => {
      const start = performance.now();
      const DURATION = 700;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / DURATION, 1);
        const resolved = Math.floor(progress * text.length);
        el.textContent = text.slice(0, resolved) + text.slice(resolved).split("").map(scrambleChar).join("");
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      el.textContent = text;
    };
  }, [text, delay]);

  return <span ref={spanRef} suppressHydrationWarning>{text}</span>;
}

/* ─── Procedural gear (engraved-line look, no assets) ───────────── */

function Gear({ teeth = 24, className }: { teeth?: number; className?: string }) {
  const f = (n: number) => n.toFixed(2);
  const ro = 96;
  const ri = 84;
  const step = (Math.PI * 2) / teeth;
  const profile: [number, number][] = [[0, ri], [0.16, ri], [0.28, ro], [0.62, ro], [0.74, ri]];
  let d = "";
  for (let i = 0; i < teeth; i++) {
    profile.forEach(([t, r], j) => {
      const a = (i + t) * step;
      d += `${i === 0 && j === 0 ? "M" : "L"}${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)} `;
    });
  }
  d += "Z";
  return (
    <svg className={`st-gear ${className ?? ""}`} viewBox="-100 -100 200 200" aria-hidden="true">
      <path d={d} />
      <circle r="72" />
      <circle r="66" strokeDasharray="1.2 3.4" />
      <circle r="24" />
      <circle r="9" />
      {Array.from({ length: 6 }, (_, k) => {
        const a = (k * Math.PI) / 3;
        return (
          <line key={k} x1={f(Math.cos(a) * 24)} y1={f(Math.sin(a) * 24)} x2={f(Math.cos(a) * 72)} y2={f(Math.sin(a) * 72)} />
        );
      })}
    </svg>
  );
}

/* ─── Beat: one statement that fades in/out across a chapter ────── */

function Beat({ i, total, children }: { i: number; total: number; children: React.ReactNode }) {
  const cls = ["st-beat", i === 0 ? "st-beat-first" : "", i === total - 1 ? "st-beat-last" : ""].join(" ");
  return <div className={cls} style={cv({ "--i": i, "--n": total })}>{children}</div>;
}

/* ─── Content ───────────────────────────────────────────────────── */

const ROLES = [
  "Full-Stack Developer.",
  "React & Next.js Engineer.",
  "Flutter App Builder.",
  "QA Automation Engineer.",
  "UI Perfectionist.",
];

const STORY = [
  { a: "Frontend / Full-Stack Developer", b: "based in Islamabad, Pakistan." },
  { a: "I design, build and ship web platforms end to end.", b: "React frontends, APIs, live on Vercel." },
  { a: "I bring a QA mindset to everything I build.", b: "Reliability is baked in from the start." },
];

const SKILLS: { cat: string; items: string[] }[] = [
  { cat: "Frontend", items: ["React.js", "Next.js", "Tailwind CSS", "HTML5", "CSS3", "JavaScript"] },
  { cat: "Mobile", items: ["Flutter", "Dart"] },
  { cat: "Full-Stack & APIs", items: ["REST APIs", "Firebase", "MongoDB", "SQL"] },
  { cat: "Automation & AI", items: ["n8n Workflows", "AI-Assisted Dev"] },
  { cat: "Deployment", items: ["Vercel", "Netlify", "Git / GitHub", "Docker"] },
  { cat: "QA & Testing", items: ["Postman / Newman", "Selenium WebDriver", "Apache JMeter"] },
];

// Chronological: the story builds left to right.
const TIMELINE = [
  {
    year: "2022",
    title: "Where It All Started",
    desc: "First lines of HTML. First React component. First bug that took hours to fix. Joined Air University for BS Information Technology. Been hooked ever since.",
  },
  {
    year: "2023",
    title: "APIs, Testing & Workflow Automation",
    desc: "Went deep into REST API integration, QA automation with Selenium and JMeter, and CI-ready Postman/Newman test collections. Learned that reliability matters as much as features.",
  },
  {
    year: "2024",
    title: "Mobile & E-Commerce",
    desc: "Built BazaarBox -- a cross-platform e-commerce app in Flutter with Firebase auth and real-time sync. Shipped GlamourHub, a premium e-commerce web app for the Pakistani market.",
  },
  {
    year: "2025",
    title: "Apexify Internship & Production Work",
    desc: "Frontend Dev Intern at Apexify Technologies — built production-ready React interfaces. Deepened Next.js for production-scale work and sharpened full-stack integration skills.",
  },
  {
    year: "2026",
    title: "Zong 5G, QA with Zaka & 3D Portfolio",
    desc: "QA Automation Intern at Zong 5G. Shipped QA with Zaka — a full-stack educational platform built end-to-end. Built an n8n-powered website health scanner. Then built this immersive 3D portfolio: cursor-tracking avatar, floating carousel, scroll-animated pages.",
  },
];

const FACTS = [
  { text: "Pixel-perfect or it doesn't ship.", tag: "OBSESSION" },
  { text: "Best commits land after midnight.", tag: "HABITS" },
  { text: "Coffee, code, repeat. Non-negotiable.", tag: "FUEL" },
  { text: "More side projects than finished ones.", tag: "CONFESSION" },
  { text: "1px off? Can't unsee it. Won't ignore it.", tag: "TRUTH" },
];

/* ─── Page ──────────────────────────────────────────────────────── */

export default function About() {
  useScrollUnlock();
  const rootRef = useRef<HTMLElement>(null);
  useChapterProgress(rootRef);

  const toolkitTotal = SKILLS.length + 1;
  const factsTotal = FACTS.length + 1;

  return (
    <main ref={rootRef} className="st-root">
      <div className="st-nav">
        <Link href="/">{'←'} Back.</Link>
        <span>About me</span>
      </div>
      <div className="st-pg" aria-hidden="true" />

      {/* 0 — HERO */}
      <section className="st-chapter st-hero" data-chapter data-dark-from="0.62">
        <div className="st-sticky">
          <div className="st-hero-content">
            <p className="st-hero-eyebrow">HEY, I&apos;M</p>
            <h1 className="st-hero-name" aria-label="ZAKA ULLAH WAHEED">
              <ScrambleText text="ZAKA" delay={80} /><br />
              <ScrambleText text="ULLAH" delay={260} /><br />
              <ScrambleText text="WAHEED." delay={440} />
            </h1>
            <div className="st-hero-role">
              <Typewriter phrases={ROLES} />
              <span className="st-caret" />
            </div>
          </div>
          <div className="st-iris" />
          <div className="st-scroll-hint" aria-hidden="true">
            <span>SCROLL</span>
            <i />
          </div>
        </div>
      </section>

      {/* 1 — STORY */}
      <section className="st-chapter st-dark st-story" data-chapter data-tone="dark">
        <div className="st-sticky">
          <Gear teeth={28} className="st-g3" />
          <Gear teeth={24} className="st-g1" />
          <Gear teeth={14} className="st-g2" />
          {STORY.map((s, i) => (
            <Beat key={i} i={i} total={STORY.length}>
              <p className="st-line-a">{s.a}</p>
              <p className="st-bw"><span className="st-b">{s.b}</span></p>
            </Beat>
          ))}
        </div>
      </section>

      {/* 2 — TOOLKIT */}
      <section className="st-chapter st-dark st-toolkit" data-chapter data-tone="dark">
        <div className="st-sticky">
          <Gear teeth={36} className="st-g1" />
          <Gear teeth={16} className="st-g2" />
          <Gear teeth={12} className="st-g3" />
          <Beat i={0} total={toolkitTotal}>
            <p className="st-label">02 {'—'} TOOLKIT</p>
            <h2 className="st-big-head">What I build with.</h2>
          </Beat>
          {SKILLS.map((s, i) => (
            <Beat key={s.cat} i={i + 1} total={toolkitTotal}>
              <h3 className="st-cat">{s.cat}</h3>
              <p className="st-items">
                {s.items.map((it, k) => (
                  <span key={it} style={cv({ "--k": k })}>{it}</span>
                ))}
              </p>
            </Beat>
          ))}
        </div>
      </section>

      {/* 3 — JOURNEY */}
      <section className="st-chapter st-journey" data-chapter>
        <div className="st-sticky">
          <div className="st-journey-head">
            <p className="st-label">03 {'—'} JOURNEY</p>
          </div>
          <div
            className="st-track"
            style={cv({ width: `${TIMELINE.length * 100}%`, "--shift": `${((TIMELINE.length - 1) / TIMELINE.length) * 100}%` })}
          >
            {TIMELINE.map((t) => (
              <div className="st-panel" key={t.year}>
                <span className="st-year-ghost" aria-hidden="true">{t.year}</span>
                <div className="st-panel-body">
                  <p className="st-panel-year">{t.year}</p>
                  <h2 className="st-panel-title">{t.title}</h2>
                  <p className="st-panel-desc">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="st-bar" aria-hidden="true"><i /></div>
        </div>
      </section>

      {/* 4 — REAL TALK */}
      <section className="st-chapter st-dark st-facts" data-chapter data-tone="dark">
        <div className="st-sticky">
          <Beat i={0} total={factsTotal}>
            <p className="st-label">04 {'—'} HUMAN THINGS</p>
            <h2 className="st-big-head">Real talk.</h2>
          </Beat>
          {FACTS.map((f, i) => (
            <Beat key={f.tag} i={i + 1} total={factsTotal}>
              <p className="st-label">0{i + 1} / 0{FACTS.length}</p>
              <p className="st-fact">{f.text}</p>
              <p className="st-fact-tag">{f.tag}</p>
            </Beat>
          ))}
        </div>
      </section>

      {/* 5 — CLOSING */}
      <section className="st-cta">
        <Reveal>
          <p className="st-label" style={{ marginBottom: "0.8rem", color: "var(--ink-50)", opacity: 1 }}>
            THAT&apos;S ENOUGH ABOUT ME
          </p>
          <h2 className="st-cta-title">
            Let&apos;s talk<br />about your<br />project.
          </h2>
          <div className="st-cta-row">
            <Link href="/contact" className="st-btn st-btn-solid">Say hi</Link>
            <Link href="/projects" className="st-btn st-btn-ghost">See work</Link>
            <Link href="/resume" className="st-btn st-btn-ghost">Resume</Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
