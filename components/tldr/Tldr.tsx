"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";
import { PROJECTS } from "@/lib/projects";
import { resume } from "@/lib/resume";
import { SOCIAL } from "@/lib/site";
import { AVAIL } from "@/lib/availability";
import { askInstall, usePwa } from "@/lib/pwa";
import { useLang } from "@/components/i18n/Lang";
import CountUp from "@/components/hire/CountUp";
import Testimonials from "@/components/Testimonials";
import "./tldr.css";

/* /tldr: the whole portfolio on one screen, for someone who has thirty seconds. It is also
   something to paste into a job application or a message: a link, a copy button and a share
   button (where the device has one). The three projects below are the ones to look at first;
   change TOP to change them. Every number comes from the project pages.
   The same component serves /ur/tldr: <UrduRoot> (components/i18n) supplies the language, and every visible
   string goes through t() (the Urdu is in lib/ur.ts; English is the key, so this page reads the same as ever). */

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

export default function Tldr() {
  useScrollUnlock();
  const { t, lang, href, ar } = useLang();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const timer = useRef(0);
  const pwa = usePwa();

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => window.clearTimeout(timer.current);
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
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  };

  const share = () => {
    navigator.share?.({ title: t("Zaka Ullah Waheed: the short version"), text: t("Full-stack developer with a QA mindset. One screen."), url: window.location.href.split("#")[0] }).catch(() => {});
  };

  const top = TOP.map((s) => PROJECTS.find((p) => p.slug === s)).filter((p): p is (typeof PROJECTS)[number] => !!p);
  const hours = t("{a} to {b}, {from} to {to} PKT", { a: t(days[AVAIL.days[0]]), b: t(days[AVAIL.days[AVAIL.days.length - 1]]), from: hh(AVAIL.from), to: hh(AVAIL.to) });

  return (
    <main className="td-root">
      <nav className="td-nav" aria-label={t("Page")}>
        <Link href="/">{ar.back} {t("BACK")}</Link>
        <span>
          {t("TL;DR")}{" "}
          {lang === "ur"
            ? <Link href="/tldr" className="td-lang" lang="en" hrefLang="en">English</Link>
            : <Link href="/ur/tldr" prefetch={false} className="td-lang" lang="ur" hrefLang="ur">{'اردو'}</Link>}
        </span>
        <Link href="/resume">{t("RESUME")} {ar.ext}</Link>
      </nav>

      <header className="td-hero">
        <p className="td-kicker">{resume.name.toUpperCase()} {'—'} {t(resume.location.split(",")[0]).toUpperCase()}</p>
        <h1 className="td-h1"><span>{t("THE SHORT")}</span><span>{t("VERSION.")}</span></h1>
        <p className="td-lead">
          {t("A full-stack developer with a QA mindset. He builds web platforms end to end, then tests them like he is trying to break them. Open to remote work.")}
        </p>
      </header>

      <section className="td-facts" aria-label={t("In numbers")}>
        {FACTS.map((f, i) => (
          <div key={f.label} className="td-fact">
            <span className="td-num"><CountUp to={f.n} delay={180 + i * 120} /></span>
            <span className="td-flabel">{t(f.label)}</span>
          </div>
        ))}
      </section>

      <section className="td-sec" aria-labelledby="td-does">
        <h2 id="td-does" className="td-h2">{t("WHAT HE DOES")}</h2>
        <div className="td-does">
          {DOES.map((d) => (
            <div key={d.verb} className="td-do">
              <span className="td-verb">{t(d.verb)}</span>
              <p>{t(d.text)}</p>
            </div>
          ))}
        </div>
      </section>

      <Testimonials className="td-sec" />

      <section className="td-sec" aria-labelledby="td-look">
        <h2 id="td-look" className="td-h2">{t("THREE THINGS TO OPEN FIRST")}</h2>
        <ol className="td-projects">
          {top.map((p, i) => (
            <li key={p.slug} className="td-proj">
              <span className="td-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div className="td-pbody">
                <Link href={`/projects/${p.slug}`} className="td-ptitle">{p.title}<span aria-hidden="true"> {ar.fwd}</span></Link>
                <p className="td-pkind">{t(p.kind).toUpperCase()} {'·'} {t(p.status).toUpperCase()}</p>
                <p className="td-ppitch">{t(p.pitch)}</p>
                <p className="td-chips">{p.chips.map((c) => <span key={c}>{c}</span>)}</p>
              </div>
              <div className="td-plinks">
                {p.live && <a href={p.live} target="_blank" rel="noopener noreferrer">{t("LIVE")} {ar.ext}</a>}
                {p.repo && <a href={p.repo} target="_blank" rel="noopener noreferrer">{t("CODE")} {ar.ext}</a>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="td-hire" aria-labelledby="td-work">
        <h2 id="td-work" className="td-h2 td-h2-inv">{t("WORK WITH HIM")}</h2>
        <p className="td-hours">{t("Replies and calls: {hours} ({place}).", { hours, place: t(AVAIL.place) })}</p>
        <div className="td-actions">
          <Link href={href("/hire#fit")} className="td-btn td-btn-solid">{t("CHECK THE FIT")}</Link>
          <Link href={href("/hire#call")} className="td-btn">{t("FIND A CALL TIME")}</Link>
          <Link href="/contact-me" className="td-btn">{t("SEND A BRIEF")}</Link>
          <a href={`mailto:${SOCIAL.email}`} className="td-btn">{t("EMAIL")}</a>
        </div>
      </section>

      <footer className="td-share">
        <div className="td-share-btns">
          <button type="button" className="td-btn td-btn-ghost" onClick={copy}>{copied ? t("LINK COPIED") : t("COPY LINK")}</button>
          {canShare && <button type="button" className="td-btn td-btn-ghost" onClick={share}>{t("SHARE")}</button>}
          <button type="button" className="td-btn td-btn-ghost" onClick={() => window.print()}>{t("PRINT")}</button>
          {!pwa.installed && (pwa.canInstall || pwa.ios) && <button type="button" className="td-btn td-btn-ghost" onClick={askInstall}>{t("INSTALL APP")}</button>}
        </div>
        <span className="td-live" role="status" aria-live="polite">{copied ? t("Link copied to the clipboard") : ""}</span>
        <p className="td-more">{t("Prefer the long version?")} <Link href="/about">{t("About")}</Link> {'·'} <Link href="/projects">{t("Projects")}</Link> {'·'} <Link href="/resume">{t("Resume")}</Link></p>
      </footer>
    </main>
  );
}
