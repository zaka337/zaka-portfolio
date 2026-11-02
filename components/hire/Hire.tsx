"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";
import { AVAIL, clock } from "@/lib/availability";
import { useLang } from "@/components/i18n/Lang";
import Testimonials from "@/components/Testimonials";
import FitChecker from "./FitChecker";
import MeetHelper from "./MeetHelper";
import Estimator from "./Estimator";
import "./hire.css";

/* /hire: three small tools for people who might work with Zaka. Check whether his skills match
   a job description, find a call time in your own time zone, and get a rough timeline for a
   project. Every one runs in the browser, and each can hand a ready-written message to the
   contact form. The tab can be linked to directly: /hire#fit, /hire#call, /hire#estimate.
   The same page serves /ur/hire (see components/i18n): every visible string goes through t(). */

const TABS = [
  { id: "fit", label: "Job-fit check", blurb: "Do my skills match your role?" },
  { id: "call", label: "Book a call", blurb: "A time that works in your zone" },
  { id: "estimate", label: "Project estimate", blurb: "How long would it take?" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const isTab = (v: string): v is TabId => TABS.some((t) => t.id === v);

export default function Hire() {
  useScrollUnlock();
  const { t, lang, ar } = useLang();
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

  // Arrow keys move between tabs, as people expect from a tab bar (in right-to-left the next tab is on the left)
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((x) => x.id === tab);
    const next = lang === "ur" ? "ArrowLeft" : "ArrowRight";
    const prev = lang === "ur" ? "ArrowRight" : "ArrowLeft";
    let n = i;
    if (e.key === next) n = (i + 1) % TABS.length;
    else if (e.key === prev) n = (i + TABS.length - 1) % TABS.length;
    else return;
    e.preventDefault();
    go(TABS[n].id);
    refs.current[TABS[n].id]?.focus();
  };

  return (
    <main className="hr-root">
      <nav className="hr-nav">
        <Link href="/">{ar.back} {t("BACK")}</Link>
        <span>
          {t("HIRE")}{" "}
          {lang === "ur"
            ? <Link href="/hire" className="hr-lang" lang="en" hrefLang="en">English</Link>
            : <Link href="/ur/hire" prefetch={false} className="hr-lang" lang="ur" hrefLang="ur">{'اردو'}</Link>}
        </span>
        <Link href="/contact-me">{t("BRIEF")} {ar.ext}</Link>
      </nav>

      <header className="hr-hero">
        <div className="hr-meta">
          <span>ZAKA ULLAH WAHEED {'—'} {t("FULL-STACK DEVELOPER")}</span>
          <span className="hr-status"><i className="hr-dot" aria-hidden="true" />{t("OPEN FOR WORK")} {'·'} {t(AVAIL.place).toUpperCase()} <span className="hr-time">{time ? `${time} PKT` : ""}</span></span>
        </div>
        <h1 className="hr-h1">
          <span>{t("Let's see")}</span>
          <span>{t("if we fit.")}</span>
        </h1>
        <p className="hr-hero-lead">{t("Three small tools for anyone thinking of working with me. Each one runs in your browser, and each can turn its answer into a message to me.")}</p>
      </header>

      <div className="hr-tabs" role="tablist" aria-label={t("Tools")} onKeyDown={onKey}>
        <i className="hr-ind" aria-hidden="true" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
        {TABS.map((tb, i) => (
          <button
            key={tb.id}
            ref={(el) => { refs.current[tb.id] = el; }}
            type="button"
            role="tab"
            id={`tab-${tb.id}`}
            aria-selected={tab === tb.id}
            aria-controls={`panel-${tb.id}`}
            tabIndex={tab === tb.id ? 0 : -1}
            className="hr-tab"
            onClick={() => go(tb.id)}
          >
            <span className="hr-tab-n">0{i + 1}</span>
            <span className="hr-tab-l">{t(tb.label)}</span>
            <span className="hr-tab-b">{t(tb.blurb)}</span>
          </button>
        ))}
      </div>

      <div className="hr-panels">
        <div role="tabpanel" id="panel-fit" aria-labelledby="tab-fit" className="hr-panel" hidden={tab !== "fit"}><FitChecker /></div>
        <div role="tabpanel" id="panel-call" aria-labelledby="tab-call" className="hr-panel" hidden={tab !== "call"}><MeetHelper /></div>
        <div role="tabpanel" id="panel-estimate" aria-labelledby="tab-estimate" className="hr-panel" hidden={tab !== "estimate"}><Estimator /></div>
      </div>

      <Testimonials className="hr-proof" />

      <footer className="hr-foot">
        <p>{t("Rather just write?")} <Link href="/contact-me">{t("Start a project brief")}</Link>{t(", or ")}<Link href="/resume">{t("read the resume")}</Link>{t(".")}</p>
      </footer>
    </main>
  );
}
