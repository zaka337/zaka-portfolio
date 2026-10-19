"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useScrollUnlock } from "@/lib/scrollStory";
import WhatsAppButton from "@/components/WhatsAppButton";
import { NEEDS, TIMELINES, MAX_MESSAGE, sendContact } from "@/lib/contactForm";

const EMAIL = "zakas2379@gmail.com";

/* ─── Scramble animation ────────────────────────────────────────── */
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function scrambleChar(c: string): string {
  if (" .'/@&-".includes(c)) return c;
  return ALPHA[Math.floor(Math.random() * ALPHA.length)];
}

function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    el.textContent = text.split("").map(scrambleChar).join("");

    const timer = setTimeout(() => {
      const start    = performance.now();
      const DURATION = 680;
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

/* ─── Content ───────────────────────────────────────────────────── */
const TAPE = "AVAILABLE FOR WORK · BASED IN PAKISTAN · OPEN TO REMOTE · FULL-STACK DEVELOPER · QA AUTOMATION · REACT & NEXT.JS · FLUTTER BUILDER · ";

const ROWS = [
  { label: "LINKEDIN",  display: "ZAKA ULLAH WAHEED",  href: "https://www.linkedin.com/in/zaka-ullah-waheed-80380832a" },
  { label: "GITHUB",    display: "GITHUB.COM/ZAKA337", href: "https://github.com/zaka337" },
  { label: "INSTAGRAM", display: "@NOTXZAKA",          href: "https://www.instagram.com/notxzaka/" },
];

function buildBrief(f: { name: string; email: string; needs: string[]; timeline: string; message: string }) {
  const needs = f.needs.length ? f.needs.join(", ") : "Not sure yet";
  const subject = `Project inquiry: ${f.needs.length ? f.needs.join(", ") : "General"} (${f.name.trim()})`;
  const body = [
    "Hi Zaka,",
    "",
    f.message.trim(),
    "",
    `-- ${f.name.trim()}`,
    "",
    `Needs: ${needs}`,
    `Timeline: ${f.timeline || "Not sure yet"}`,
    `Reply to: ${f.email.trim() || "(just reply to this email)"}`,
  ].join("\n");
  return { subject, body };
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function ContactMe() {
  useScrollUnlock();

  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  const [needs, setNeeds] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bad, setBad] = useState<"name" | "email" | "message" | "">("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "fallback">("idle");
  const [hp, setHp] = useState(""); // honeypot: humans never see or fill it
  const openedAt = useRef(Date.now());
  const [copied, setCopied] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(copyTimer.current); }, []);

  const flashCopied = useCallback((what: string) => {
    setCopied(what);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(""), 2200);
  }, []);

  const copyText = useCallback((text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => flashCopied(what), () => flashCopied("failed"));
  }, [flashCopied]);

  const toggleNeed = (n: string) =>
    setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const openMailApp = () => {
    const { subject, body } = buildBrief({ name, email, needs, timeline, message });
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!name.trim()) { setBad("name"); setError("Add your name"); nameRef.current?.focus(); return; }
    if (!email.trim()) { setBad("email"); setError("Add your email so I can reply"); emailRef.current?.focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setBad("email"); setError("That email looks off"); emailRef.current?.focus(); return; }
    if (!message.trim()) { setBad("message"); setError("Tell me a few words about it"); msgRef.current?.focus(); return; }
    setBad(""); setError(""); setStatus("sending");

    const result = await sendContact({
      name: name.trim(), email: email.trim(), needs, timeline, message: message.trim(),
      website: hp, elapsed: Date.now() - openedAt.current,
    });
    if (result === "sent") { setStatus("sent"); return; }
    if (result === "invalid") { setStatus("idle"); setError("Something in the form looks off. Check it and try again"); return; }
    // The server could not send: hand the same brief to the visitor's mail app instead.
    setStatus("fallback");
    openMailApp();
  };

  const reset = () => {
    setNeeds([]); setTimeline(""); setName(""); setEmail(""); setMessage(""); setHp("");
    setError(""); setBad(""); setStatus("idle"); openedAt.current = Date.now();
  };

  const briefText = () => {
    const { subject, body } = buildBrief({ name, email, needs, timeline, message });
    return `To: ${EMAIL}\nSubject: ${subject}\n\n${body}`;
  };

  return (
    <main className="cm-root">

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <nav className="cm-nav">
        <Link href="/">{'←'} BACK</Link>
        <span>CONTACT</span>
        <span>OPEN FOR WORK</span>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="cm-hero">
        <div className="cm-meta">
          <span>{'ZAKA ULLAH WAHEED — FULL-STACK DEVELOPER'}</span>
          <span className="cm-status">
            <i className="cm-dot" aria-hidden="true" />
            OPEN FOR WORK {'·'} ISLAMABAD <span className="cm-time">{time ? `${time} PKT` : ""}</span>
          </span>
        </div>

        <h1 className="cm-h1">
          <ScrambleText text={"LET'S"} delay={80} /><br />
          <ScrambleText text="WORK." delay={200} />
        </h1>
      </header>

      {/* ── Availability tape ────────────────────────────────── */}
      <div className="cm-tape" aria-hidden="true">
        <div className="cm-tape-inner">
          <span>{TAPE}</span><span>{TAPE}</span>
        </div>
      </div>

      {/* ── Project brief ────────────────────────────────────── */}
      <section className="cm-brief" aria-labelledby="brief-title">
        <div className="cm-brief-head">
          <p className="cm-label">START A PROJECT</p>
          <h2 id="brief-title">Tell me what you&apos;re building.</h2>
          <p>
            Pick what fits, add a few words, and it lands straight in my inbox. No account needed.
            If sending is not possible, it opens a ready-to-send email in your mail app instead.
          </p>
        </div>

        <form className="cm-form" onSubmit={submit} noValidate>
          <fieldset className="cm-group">
            <legend className="cm-label">I NEED...</legend>
            <div className="cm-chips">
              {NEEDS.map((n) => (
                <button key={n} type="button" className="cm-chip" aria-pressed={needs.includes(n)} onClick={() => toggleNeed(n)}>
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="cm-group">
            <legend className="cm-label">TIMELINE</legend>
            <div className="cm-chips">
              {TIMELINES.map((t) => (
                <button key={t} type="button" className="cm-chip" aria-pressed={timeline === t} onClick={() => setTimeline(timeline === t ? "" : t)}>
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="cm-two">
            <div>
              <label className="cm-label" htmlFor="cm-name">YOUR NAME</label>
              <input
                id="cm-name" ref={nameRef} className="cm-field" type="text" autoComplete="name"
                placeholder="Jane Doe" value={name} maxLength={80}
                aria-invalid={bad === "name"}
                onChange={(e) => { setName(e.target.value); if (bad === "name") { setBad(""); setError(""); } }}
              />
            </div>
            <div>
              <label className="cm-label" htmlFor="cm-email">YOUR EMAIL</label>
              <input
                id="cm-email" ref={emailRef} className="cm-field" type="email" autoComplete="email" inputMode="email"
                placeholder="jane@company.com" value={email} maxLength={120}
                aria-invalid={bad === "email"}
                onChange={(e) => { setEmail(e.target.value); if (bad === "email") { setBad(""); setError(""); } }}
              />
            </div>
          </div>

          <div>
            <label className="cm-label" htmlFor="cm-msg">TELL ME ABOUT IT</label>
            <textarea
              id="cm-msg" ref={msgRef} className="cm-field" rows={4}
              placeholder="What are you building, and what do you need from me?"
              value={message} maxLength={MAX_MESSAGE}
              aria-invalid={bad === "message"}
              onChange={(e) => { setMessage(e.target.value); if (bad === "message") { setBad(""); setError(""); } }}
            />
            <p className="cm-count">{message.length} / {MAX_MESSAGE}</p>
          </div>

          {/* Spam trap: invisible to people, tempting to bots */}
          <input
            className="cm-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
            value={hp} onChange={(e) => setHp(e.target.value)}
          />

          <p className="cm-error" role="alert">{error}</p>

          <button type="submit" className="cm-send" disabled={status === "sending"}>
            <span>{status === "sending" ? "Sending..." : "Send brief"}</span>
            <span aria-hidden="true">{'↗'}</span>
          </button>

          {status === "sent" && (
            <div className="cm-sent" role="status">
              <p>
                <strong>Sent. Thank you, {name.trim() || "friend"}.</strong> Your message is in my inbox,
                and I&apos;ll reply to <strong>{email.trim()}</strong>.
              </p>
              <div className="cm-sent-actions">
                <button type="button" className="cm-chip" onClick={reset}>Send another</button>
              </div>
            </div>
          )}

          {status === "fallback" && (
            <div className="cm-sent" role="status">
              <p>
                <strong>I couldn&apos;t send that directly, so your mail app should be opening</strong> with the brief
                ready to send. Nothing opened? Copy it and email me at <strong>{EMAIL}</strong>.
              </p>
              <div className="cm-sent-actions">
                <button type="button" className="cm-chip" onClick={() => copyText(briefText(), "brief")}>
                  {copied === "brief" ? "Copied!" : "Copy brief"}
                </button>
                <button type="button" className="cm-chip" onClick={() => copyText(EMAIL, "email")}>
                  {copied === "email" ? "Copied!" : "Copy my email"}
                </button>
              </div>
            </div>
          )}
        </form>
      </section>

      {/* ── WhatsApp: the number is never on the page (see /whatsapp) ── */}
      <section className="cm-wa" aria-labelledby="wa-title">
        <div className="cm-wa-copy">
          <h2 id="wa-title">Prefer to chat?</h2>
          <p>Skip the form and message me directly on WhatsApp.</p>
        </div>
        <WhatsAppButton />
      </section>

      {/* ── Direct links ─────────────────────────────────────── */}
      <p className="cm-direct-label">OR REACH ME DIRECTLY</p>
      <section>
        <button type="button" className="cm-row" onClick={() => copyText(EMAIL, "row")}>
          <span className="cm-row-label">EMAIL</span>
          <span className="cm-row-value">{copied === "row" ? "COPIED!" : EMAIL.toUpperCase()}</span>
          <span className="cm-row-arrow" aria-hidden="true">{'↗'}</span>
        </button>
        <Link className="cm-row" href="/resume">
          <span className="cm-row-label">RESUME</span>
          <span className="cm-row-value">VIEW OR DOWNLOAD PDF</span>
          <span className="cm-row-arrow" aria-hidden="true">{'→'}</span>
        </Link>
        {ROWS.map((row) => (
          <a key={row.label} className="cm-row" href={row.href} target="_blank" rel="noopener noreferrer">
            <span className="cm-row-label">{row.label}</span>
            <span className="cm-row-value">{row.display}</span>
            <span className="cm-row-arrow" aria-hidden="true">{'↗'}</span>
          </a>
        ))}
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="cm-foot">
        <span>{'© 2026 — ZAKA ULLAH WAHEED'}</span>
        <span>BASED IN PAKISTAN</span>
      </footer>
    </main>
  );
}
