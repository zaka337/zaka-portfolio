"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";
import { AVAIL, clock } from "@/lib/availability";
import FitChecker from "./FitChecker";
import MeetHelper from "./MeetHelper";
import Estimator from "./Estimator";
import "./hire.css";

/* /hire: three small tools for people who might work with Zaka. Check whether his skills match
   a job description, find a call time in your own time zone, and get a rough timeline for a
   project. Every one runs in the browser, and each can hand a ready-written message to the
   contact form. The tab can be linked to directly: /hire#fit, /hire#call, /hire#estimate. */

const TABS = [
  { id: "fit", label: "Job-fit check", blurb: "Do my skills match your role?" },
  { id: "call", label: "Book a call", blurb: "A time that works in your zone" },
  { id: "estimate", label: "Project estimate", blurb: "How long would it take?" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const isTab = (v: string): v is TabId => TABS.some((t) => t.id === v);

export default function Hire() {
  useScrollUnlock();
  const [tab, setTab] = useState<TabId>("fit");
  const [time, setTime] = useState("");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({ x: 0, w: 0 });

  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (isTab(h)) setTab(h); };
    read();
    window.addEventListener("hashchange", read);
    const tick = () => setTime(clock(new Date(), AVAIL.tz));
    tick();
    const id = window.setInterval(tick, 20000);
    return () => { window.removeEventListener("hashchange", read); window.clearInterval(id); };
  }, []);

  const measure = useCallback(() => {
    const el = refs.current[tab];
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [tab]);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const go = (id: TabId) => {
    setTab(id);
    try { window.history.replaceState(null, "", `#${id}`); } catch { /* the tab still changes */ }
  };

  // Arrow keys move between tabs, as people expect from a tab bar
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i + TABS.length - 1) % TABS.length;
    else return;
    e.preventDefault();
    go(TABS[n].id);
    refs.current[TABS[n].id]?.focus();
  };

  return (
    <main className="hr-root">
      <nav className="hr-nav">
        <Link href="/">{'←'} BACK</Link>
        <span>HIRE</span>
        <Link href="/contact-me">BRIEF {'↗'}</Link>
      </nav>

      <header className="hr-hero">
        <div className="hr-meta">
          <span>ZAKA ULLAH WAHEED {'—'} FULL-STACK DEVELOPER</span>
          <span className="hr-status"><i className="hr-dot" aria-hidden="true" />OPEN FOR WORK {'·'} {AVAIL.place.toUpperCase()} <span className="hr-time">{time ? `${time} PKT` : ""}</span></span>
        </div>
        <h1 className="hr-h1">
          <span>Let&apos;s see</span>
          <span>if we fit.</span>
        </h1>
        <p className="hr-hero-lead">Three small tools for anyone thinking of working with me. Each one runs in your browser, and each can turn its answer into a message to me.</p>
      </header>

      <div className="hr-tabs" role="tablist" aria-label="Tools" onKeyDown={onKey}>
        <i className="hr-ind" aria-hidden="true" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="hr-tab"
            onClick={() => go(t.id)}
          >
            <span className="hr-tab-n">0{i + 1}</span>
            <span className="hr-tab-l">{t.label}</span>
            <span className="hr-tab-b">{t.blurb}</span>
          </button>
        ))}
      </div>

      <div className="hr-panels">
        <div role="tabpanel" id="panel-fit" aria-labelledby="tab-fit" className="hr-panel" hidden={tab !== "fit"}><FitChecker /></div>
        <div role="tabpanel" id="panel-call" aria-labelledby="tab-call" className="hr-panel" hidden={tab !== "call"}><MeetHelper /></div>
        <div role="tabpanel" id="panel-estimate" aria-labelledby="tab-estimate" className="hr-panel" hidden={tab !== "estimate"}><Estimator /></div>
      </div>

      <footer className="hr-foot">
        <p>Rather just write? <Link href="/contact-me">Start a project brief</Link>, or <Link href="/resume">read the resume</Link>.</p>
      </footer>
    </main>
  );
}
