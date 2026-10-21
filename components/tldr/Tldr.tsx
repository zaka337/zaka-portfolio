"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";
import { PROJECTS } from "@/lib/projects";
import { resume } from "@/lib/resume";
import { SOCIAL } from "@/lib/site";
import { AVAIL } from "@/lib/availability";
import CountUp from "@/components/hire/CountUp";
import "./tldr.css";

/* /tldr: the whole portfolio on one screen, for someone who has thirty seconds. It is also
   something to paste into a job application or a message: a link, a copy button and a share
   button (where the device has one). The three projects below are the ones to look at first;
   change TOP to change them. Every number comes from the project pages. */

const TOP = ["qa-with-zaka", "zong-health-scanner", "glamourhub"];

const FACTS = [
  { n: 80, label: "lessons shipped in QA with Zaka" },
  { n: 8, label: "checks per scan in the Zong health scanner" },
  { n: 17, label: "input features in the MomCare risk model" },
  { n: PROJECTS.length, label: "featured projects, each with a case study" },
];

const DOES = [
  { verb: "Build", text: "React, Next.js, TypeScript and Flutter on the front. Python APIs, Supabase and Firebase behind them." },
  { verb: "Break", text: "Playwright, Selenium, Postman and JMeter, wired into GitHub Actions so it runs on every push." },
  { verb: "Automate", text: "n8n workflows, Docker packaging and Vercel deploys, so what is built keeps running without him." },
];

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const HOURS = `${days[AVAIL.days[0]]} to ${days[AVAIL.days[AVAIL.days.length - 1]]}, ${hh(AVAIL.from)} to ${hh(AVAIL.to)} PKT`;

export default function Tldr() {
  useScrollUnlock();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const t = useRef(0);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => window.clearTimeout(t.current);
  }, []);

  const copy = async () => {
    const url = window.location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers and insecure pages: the long way round
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* nothing more to try */ }
      ta.remove();
    }
    setCopied(true);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setCopied(false), 2200);
  };

  const share = () => {
    navigator.share?.({ title: "Zaka Ullah Waheed: the short version", text: "Full-stack developer with a QA mindset. One screen.", url: window.location.href.split("#")[0] }).catch(() => {});
  };

  const top = TOP.map((s) => PROJECTS.find((p) => p.slug === s)).filter((p): p is (typeof PROJECTS)[number] => !!p);

  return (
    <main className="td-root">
      <nav className="td-nav" aria-label="Page">
        <Link href="/">{'←'} BACK</Link>
        <span>TL;DR</span>
        <Link href="/resume">RESUME {'↗'}</Link>
      </nav>

      <header className="td-hero">
        <p className="td-kicker">{resume.name.toUpperCase()} {'—'} {resume.location.split(",")[0].toUpperCase()}</p>
        <h1 className="td-h1"><span>THE SHORT</span><span>VERSION.</span></h1>
        <p className="td-lead">
          A full-stack developer with a QA mindset. He builds web platforms end to end, then tests them like he is trying to break them. Open to remote work.
        </p>
      </header>

      <section className="td-facts" aria-label="In numbers">
        {FACTS.map((f, i) => (
          <div key={f.label} className="td-fact">
            <span className="td-num"><CountUp to={f.n} delay={180 + i * 120} /></span>
            <span className="td-flabel">{f.label}</span>
          </div>
        ))}
      </section>

      <section className="td-sec" aria-labelledby="td-does">
        <h2 id="td-does" className="td-h2">WHAT HE DOES</h2>
        <div className="td-does">
          {DOES.map((d) => (
            <div key={d.verb} className="td-do">
              <span className="td-verb">{d.verb}</span>
              <p>{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="td-sec" aria-labelledby="td-look">
        <h2 id="td-look" className="td-h2">THREE THINGS TO OPEN FIRST</h2>
        <ol className="td-projects">
          {top.map((p, i) => (
            <li key={p.slug} className="td-proj">
              <span className="td-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div className="td-pbody">
                <Link href={`/projects/${p.slug}`} className="td-ptitle">{p.title}<span aria-hidden="true"> {'→'}</span></Link>
                <p className="td-pkind">{p.kind.toUpperCase()} {'·'} {p.status.toUpperCase()}</p>
                <p className="td-ppitch">{p.pitch}</p>
                <p className="td-chips">{p.chips.map((c) => <span key={c}>{c}</span>)}</p>
              </div>
              <div className="td-plinks">
                {p.live && <a href={p.live} target="_blank" rel="noopener noreferrer">LIVE {'↗'}</a>}
                {p.repo && <a href={p.repo} target="_blank" rel="noopener noreferrer">CODE {'↗'}</a>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="td-hire" aria-labelledby="td-work">
        <h2 id="td-work" className="td-h2 td-h2-inv">WORK WITH HIM</h2>
        <p className="td-hours">Replies and calls: {HOURS} ({AVAIL.place}).</p>
        <div className="td-actions">
          <Link href="/hire#fit" className="td-btn td-btn-solid">CHECK THE FIT</Link>
          <Link href="/hire#call" className="td-btn">FIND A CALL TIME</Link>
          <Link href="/contact-me" className="td-btn">SEND A BRIEF</Link>
          <a href={`mailto:${SOCIAL.email}`} className="td-btn">EMAIL</a>
        </div>
      </section>

      <footer className="td-share">
        <div className="td-share-btns">
          <button type="button" className="td-btn td-btn-ghost" onClick={copy}>{copied ? "LINK COPIED" : "COPY LINK"}</button>
          {canShare && <button type="button" className="td-btn td-btn-ghost" onClick={share}>SHARE</button>}
          <button type="button" className="td-btn td-btn-ghost" onClick={() => window.print()}>PRINT</button>
        </div>
        <span className="td-live" role="status" aria-live="polite">{copied ? "Link copied to the clipboard" : ""}</span>
        <p className="td-more">Prefer the long version? <Link href="/about">About</Link> {'·'} <Link href="/projects">Projects</Link> {'·'} <Link href="/resume">Resume</Link></p>
      </footer>
    </main>
  );
}
