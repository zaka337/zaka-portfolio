"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/lib/projects";
import { RESUME_PDF, resume } from "@/lib/resume";
import { AVAIL, clock, localZone, offsetLabel, status, zakaWorking } from "@/lib/availability";
import { EMAIL, PROFILE, type AppId, type Skin } from "@/lib/phoneOS";
import PhoneGlyph from "./PhoneGlyph";
import PhoneSnake from "./PhoneSnake";
import { useNow } from "./useNow";

/* What is inside each app. Every phone shows the same apps, styled by that phone's colours (the
   --ph-* variables in phones.css). They are all real: write to Zaka, open his profiles, read the
   project list, get the resume, play Snake, see both clocks, find a call time, try the QA challenge. */

function MailApp() {
  const [subject, setSubject] = useState("Hi Zaka (from your portfolio)");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const say = (t: string, ms = 2400) => { setNote(t); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setNote(""), ms); };

  const send = () => {
    if (!body.trim()) { say("Write a few words first."); return; }
    say("Opening your mail app...", 3200);
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject.trim() || "Hi Zaka")}&body=${encodeURIComponent(body.trim() + "\n")}`;
  };
  const copy = () => { navigator.clipboard?.writeText(EMAIL).then(() => say("Address copied"), () => say("Could not copy")); };

  return (
    <div className="ph-mail">
      <div className="ph-to"><span>To</span><b>{EMAIL}</b><button type="button" className="ph-mini" onClick={copy} aria-label="Copy the email address">Copy</button></div>
      <label className="ph-field"><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={90} /></label>
      <label className="ph-field ph-grow"><span>Message</span><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={900} placeholder="What would you like to talk about?" /></label>
      <button type="button" className="ph-btn is-main" onClick={send}><span>Send</span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 11.5 21 4l-6.5 16-3.2-6.6z" fill="currentColor" /></svg></button>
      <p className="ph-note" role="status" aria-live="polite">{note}</p>
    </div>
  );
}

function ProfileApp({ id }: { id: AppId }) {
  const p = PROFILE[id]!;
  return (
    <div className="ph-profile">
      <span className="ph-big" aria-hidden="true"><PhoneGlyph id={id} /></span>
      <h3>{p.name}</h3>
      <p className="ph-dim">{p.handle}</p>
      <p>{p.blurb}</p>
      <a className="ph-btn is-main" href={p.url} target="_blank" rel="noopener noreferrer"><span>{p.cta}</span><span aria-hidden="true">{'↗'}</span></a>
    </div>
  );
}

function WhatsAppApp() {
  return (
    <div className="ph-chat">
      <p className="ph-bubble is-in" style={{ ["--i" as string]: 0 } as React.CSSProperties}>Hi! I&apos;m Zaka.</p>
      <p className="ph-bubble is-in" style={{ ["--i" as string]: 1 } as React.CSSProperties}>Message me about a project, a job, or a bug you can&apos;t find.</p>
      <p className="ph-bubble is-out" style={{ ["--i" as string]: 2 } as React.CSSProperties}>Is this really you?</p>
      <p className="ph-bubble is-in" style={{ ["--i" as string]: 3 } as React.CSSProperties}>Yes. Tap below and it opens WhatsApp for you.</p>
      <a className="ph-btn is-main" href="/whatsapp" target="_blank" rel="noopener noreferrer"><span>Message me directly</span><span aria-hidden="true">{'↗'}</span></a>
      <p className="ph-note">My number is never shown on this page.</p>
    </div>
  );
}

function ProjectsApp() {
  return (
    <ul className="ph-list">
      {PROJECTS.map((p, i) => (
        <li key={p.slug} style={{ ["--i" as string]: i } as React.CSSProperties}>
          <Link href={`/projects/${p.slug}`}>
            <span className="ph-row-t">{p.title}</span>
            <span className="ph-row-s">{p.kind} {'·'} {p.year}</span>
            <span className="ph-row-a" aria-hidden="true">{'›'}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ResumeApp() {
  const first = resume.summary.split(". ")[0] + ".";
  return (
    <div className="ph-resume">
      <h3>{resume.name}</h3>
      <p className="ph-dim">{resume.title}</p>
      <p>{first}</p>
      <ul className="ph-facts">
        {resume.experience.map((e) => <li key={e.org}><b>{e.org}</b><span>{e.role} {'·'} {e.period}</span></li>)}
        {resume.education.map((e) => <li key={e.school}><b>{e.school}</b><span>{e.degree}</span></li>)}
      </ul>
      <div className="ph-two">
        <a className="ph-btn is-main" href={RESUME_PDF} download><span>Download PDF</span></a>
        <Link className="ph-btn" href="/resume"><span>Read online</span></Link>
      </div>
    </div>
  );
}

/* An analogue clock whose hands follow the time in one place */
function Dial({ now, tz, label }: { now: Date; tz: string; label: string }) {
  const [h, m, s] = clock(now, tz, true).split(":").map(Number);
  const sec = s * 6, min = m * 6 + s * 0.1, hour = (h % 12) * 30 + m * 0.5;
  return (
    <div className="ph-dial">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" className="face" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="8" x2="50" y2={i % 3 === 0 ? 15 : 12} transform={`rotate(${i * 30} 50 50)`} className="tick" />)}
        <line x1="50" y1="50" x2="50" y2="26" transform={`rotate(${hour} 50 50)`} className="hand hour" />
        <line x1="50" y1="50" x2="50" y2="16" transform={`rotate(${min} 50 50)`} className="hand min" />
        <line x1="50" y1="56" x2="50" y2="12" transform={`rotate(${sec} 50 50)`} className="hand sec" />
        <circle cx="50" cy="50" r="2.6" className="pin" />
      </svg>
      <b>{clock(now, tz)}</b>
      <span>{label}</span>
    </div>
  );
}

function ClockApp() {
  const now = useNow(1000);
  const [tz, setTz] = useState("UTC");
  useEffect(() => setTz(localZone()), []);
  if (!now) return <div className="ph-clock" />;
  const working = zakaWorking(now);
  return (
    <div className="ph-clock">
      <div className="ph-dials">
        <Dial now={now} tz={tz} label={`You ${offsetLabel(tz, now)}`} />
        <Dial now={now} tz={AVAIL.tz} label={`${AVAIL.place} UTC+5`} />
      </div>
      <p className={`ph-pill${working ? " is-on" : ""}`}>{working ? "Zaka is working now" : "Zaka is off for now"}</p>
      <p className="ph-note">{tz.replace(/_/g, " ")}</p>
    </div>
  );
}

function BookApp() {
  const now = useNow(30000);
  const [tz, setTz] = useState("UTC");
  useEffect(() => setTz(localZone()), []);
  let mine = "";
  if (now) {
    // Today's working hours in Islamabad, written in the visitor's own zone (Pakistan has no daylight saving: UTC+5)
    const pk = new Date(now.getTime() + 5 * 3600000);
    const base = Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate(), 0, 0) - 5 * 3600000;
    const a = new Date(base + AVAIL.from * 60000), b = new Date(base + AVAIL.to * 60000);
    mine = `${clock(a, tz)} to ${clock(b, tz)}`;
  }
  const st = now ? status(now) : null;
  return (
    <div className="ph-book">
      <span className="ph-big" aria-hidden="true"><PhoneGlyph id="book" /></span>
      <h3>Book a call</h3>
      <p>I work Monday to Friday, {String(AVAIL.from / 60).padStart(2, "0")}:00 to {String(AVAIL.to / 60).padStart(2, "0")}:00 in {AVAIL.place}.</p>
      {mine && <p className="ph-dim">Today, that is {mine} where you are.</p>}
      {st && <p className={`ph-pill${st.open ? " is-on" : ""}`}>{st.open ? "Working now" : "Off for now"}</p>}
      <Link className="ph-btn is-main" href="/hire#call"><span>Find a time</span><span aria-hidden="true">{'→'}</span></Link>
    </div>
  );
}

function QaApp() {
  return (
    <div className="ph-book">
      <span className="ph-big" aria-hidden="true"><PhoneGlyph id="qa" /></span>
      <h3>Break this checkout</h3>
      <p>A small shop with six bugs hidden in it. You are the tester. Find them all.</p>
      <Link className="ph-btn is-main" href="/qa-challenge"><span>Start testing</span><span aria-hidden="true">{'→'}</span></Link>
    </div>
  );
}

export default function AppView({ id, skin }: { id: AppId; skin: Skin }) {
  switch (id) {
    case "mail": return <MailApp />;
    case "whatsapp": return <WhatsAppApp />;
    case "linkedin": case "github": case "instagram": return <ProfileApp id={id} />;
    case "projects": return <ProjectsApp />;
    case "resume": return <ResumeApp />;
    case "snake": return <PhoneSnake skin={skin} />;
    case "clock": return <ClockApp />;
    case "book": return <BookApp />;
    case "qa": return <QaApp />;
  }
}
