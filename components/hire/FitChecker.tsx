"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyse, summarise, SAMPLES, SKILLS, type Fit, type Have } from "@/lib/fit";
import { saveDraft } from "@/lib/draft";
import { play } from "@/lib/sound";
import CountUp from "./CountUp";

/* The job-fit checker. Paste a job description and it scans the text, lights up every technology
   it recognises, and shows how they compare with Zaka's real resume and projects: what he has
   (with where it shows), what is close, and what is not there yet. The answer can be a "no", and
   it says so. All of it runs in the visitor's browser (lib/fit.ts); nothing is uploaded. */

const SCAN_MS = 2300;
const MAX = 8000;
const RING = 2 * Math.PI * 52;

const VERDICT_LINE: Record<Fit["verdict"], string> = {
  "Strong fit": "Most of what you asked for is on my resume.",
  "Good fit": "Most of it is there, with a few gaps.",
  "Partial fit": "Some of it is there. Here is the honest picture.",
  "Low fit": "This one is not a match, and I would rather tell you now.",
};

const HAVE_LABEL: Record<Have, string> = { yes: "I have it", related: "Close", no: "Not yet" };

/* The pasted text with every recognised technology wrapped in a mark. While scanning, each mark
   lights up when the scan line reaches its place in the text. */
function Marked({ text, fit, scanning }: { text: string; fit: Fit; scanning: boolean }) {
  const out: React.ReactNode[] = [];
  let at = 0;
  fit.spans.forEach((s, i) => {
    if (s.start < at) return;
    if (s.start > at) out.push(<Fragment key={`t${i}`}>{text.slice(at, s.start)}</Fragment>);
    out.push(
      <mark
        key={`m${i}`}
        className={`ft-mark is-${s.have}${scanning ? " is-scan" : ""}`}
        style={scanning ? ({ ["--d" as string]: `${Math.round((s.start / Math.max(1, text.length)) * SCAN_MS * 0.9)}ms` } as React.CSSProperties) : undefined}
      >
        {text.slice(s.start, s.end)}
      </mark>,
    );
    at = s.end;
  });
  if (at < text.length) out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <>{out}</>;
}

export default function FitChecker() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "scan" | "result">("input");
  const [fit, setFit] = useState<Fit | null>(null);
  const [copied, setCopied] = useState(false);
  const scanned = useRef("");
  const timer = useRef(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = (value = text) => {
    const t = value.trim();
    if (!t) return;
    const f = analyse(t);
    scanned.current = t;
    setFit(f);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(timer.current);
    if (calm || !f.spans.length) { setPhase("result"); return; }
    setPhase("scan");
    play("tick");
    timer.current = window.setTimeout(() => { setPhase("result"); play("chime"); }, SCAN_MS + 150);
  };

  useEffect(() => {
    if (phase === "result") top.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [phase]);

  const again = () => { window.clearTimeout(timer.current); setPhase("input"); setFit(null); setCopied(false); };

  const groups = useMemo(() => {
    if (!fit) return null;
    return (["yes", "related", "no"] as Have[]).map((h) => ({ have: h, items: fit.detected.filter((d) => d.skill.have === h) }));
  }, [fit]);

  const copy = async () => {
    if (!fit) return;
    try { await navigator.clipboard.writeText(summarise(fit)); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { /* clipboard refused */ }
  };

  const talk = () => {
    if (!fit) return;
    const needs = fit.role === "QA / test automation" ? ["QA & test automation"] : fit.role === "Mobile" ? ["Mobile app"] : fit.role === "Data / AI" ? ["AI & automation"] : ["Web app"];
    saveDraft({
      from: "job-fit check",
      message: `Hi Zaka, I ran a job-fit check for a role we have, and I'd like to talk about it.\n\n${summarise(fit)}\n\nAbout the role: `,
      needs,
    });
    router.push("/contact-me");
  };

  const empty = fit && fit.detected.length === 0;

  return (
    <section className="ft" aria-labelledby="ft-title">
      <div className="ft-intro">
        <p className="hr-label">JOB-FIT CHECK</p>
        <h2 id="ft-title" className="hr-h2">Does my skill set match your role?</h2>
        <p className="hr-lead">
          Paste a job description. I will scan it for the tools and skills it names and compare them with my real
          resume and projects, with the gaps shown as plainly as the matches.
        </p>
      </div>

      {phase === "input" && (
        <div className="ft-input">
          <div className="ft-samples" role="group" aria-label="Try an example">
            <span className="hr-micro">Try one:</span>
            {SAMPLES.map((s) => (
              <button key={s.id} type="button" className="hr-chip" onClick={() => { setText(s.text); run(s.text); }}>{s.label}</button>
            ))}
          </div>
          <label className="hr-micro" htmlFor="ft-text">JOB DESCRIPTION</label>
          <textarea
            id="ft-text"
            className="ft-text"
            rows={9}
            maxLength={MAX}
            placeholder="Paste the requirements here: the tools, the skills, the years of experience..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(); }}
          />
          <div className="ft-bar">
            <p className="hr-note">Your text stays in your browser. Nothing is uploaded or stored. <span className="hr-faint">{text.length} / {MAX}</span></p>
            <button type="button" className="hr-btn is-main" onClick={() => run()} disabled={!text.trim()}>
              <span>Check the fit</span><span aria-hidden="true">{'→'}</span>
            </button>
          </div>
        </div>
      )}

      {phase === "scan" && fit && (
        <div className="ft-scan" aria-live="polite">
          <p className="hr-micro">SCANNING {fit.spans.length} {fit.spans.length === 1 ? "TERM" : "TERMS"}...</p>
          <div className="ft-page">
            <div className="ft-line" aria-hidden="true" />
            <p className="ft-copy"><Marked text={scanned.current} fit={fit} scanning /></p>
          </div>
          <div className="ft-prog" aria-hidden="true"><i /></div>
        </div>
      )}

      {phase === "result" && fit && (
        <div className="ft-result" ref={top}>
          <p className="hr-srt" role="status">{empty ? "No recognisable technologies found." : `${fit.verdict}: ${Math.round(fit.score * 100)} percent. ${VERDICT_LINE[fit.verdict]}`}</p>

          {empty ? (
            <div className="ft-empty">
              <h3 className="hr-h3">I could not find any technologies in that text.</h3>
              <p className="hr-lead">Try pasting the part of the job post that lists the tools and requirements, rather than the company description.</p>
              <button type="button" className="hr-btn is-main" onClick={again}><span>Try again</span></button>
            </div>
          ) : (
            <>
              <div className="ft-head">
                <div className="ft-ring" aria-hidden="true" style={{ ["--c" as string]: RING, ["--o" as string]: RING * (1 - fit.score) } as React.CSSProperties}>
                  <svg viewBox="0 0 120 120" width="160" height="160">
                    <circle cx="60" cy="60" r="52" className="ft-ring-bg" />
                    <circle cx="60" cy="60" r="52" className="ft-ring-fg" transform="rotate(-90 60 60)" />
                  </svg>
                  <div className="ft-pct"><CountUp to={Math.round(fit.score * 100)} suffix="%" ms={1200} delay={250} /></div>
                </div>
                <div className="ft-verdict">
                  <p className="hr-micro">{fit.role ? `THIS ROLE LEANS: ${fit.role.toUpperCase()}` : "THE VERDICT"}</p>
                  <h3 className="ft-big">{fit.verdict}.</h3>
                  <p className="hr-lead">{VERDICT_LINE[fit.verdict]}</p>
                  <p className="ft-tally" aria-hidden="true">
                    <span className="is-yes">{fit.counts.yes} I have it</span>
                    <span className="is-related">{fit.counts.related} close</span>
                    <span className="is-no">{fit.counts.no} not yet</span>
                  </p>
                </div>
              </div>

              {fit.notes.length > 0 && (
                <ul className="ft-notes">
                  {fit.notes.map((n, i) => <li key={i} style={{ ["--i" as string]: i } as React.CSSProperties}>{n}</li>)}
                </ul>
              )}

              <div className="ft-cols">
                {groups?.map((g) => g.items.length > 0 && (
                  <div key={g.have} className={`ft-col is-${g.have}`}>
                    <h4 className="ft-col-h"><span className="ft-dot" aria-hidden="true" />{HAVE_LABEL[g.have]} <span className="hr-faint">{g.items.length}</span></h4>
                    <ul>
                      {g.items.map((d, i) => (
                        <li key={d.skill.id} className="ft-skill" style={{ ["--i" as string]: i + (g.have === "yes" ? 0 : g.have === "related" ? 3 : 5) } as React.CSSProperties}>
                          <span className="ft-name">{d.skill.name}</span>
                          {g.have === "yes" && (
                            <span className="ft-proof">
                              {d.projects.length > 0 ? (
                                <>Used in {d.projects.map((p, k) => (
                                  <Fragment key={p.slug}>{k > 0 && ", "}<Link href={`/projects/${p.slug}`}>{p.title}</Link></Fragment>
                                ))}{d.experience.length > 0 && <> and at {d.experience.join(", ")}</>}</>
                              ) : d.experience.length > 0 ? <>From my work at {d.experience.join(", ")}</> : <>On my resume.</>}
                              {d.skill.note ? ` ${d.skill.note}` : ""}
                            </span>
                          )}
                          {g.have === "related" && <span className="ft-proof">Closest: {d.skill.closest}. {d.skill.note}</span>}
                          {g.have === "no" && <span className="ft-proof">Not on my resume.</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {fit.topProjects.length > 0 && (
                <div className="ft-work">
                  <p className="hr-micro">THE WORK THAT SHOWS THE MOST OF THIS</p>
                  <div className="ft-work-row">
                    {fit.topProjects.map((p, i) => (
                      <Link key={p.slug} href={`/projects/${p.slug}`} className="ft-card" style={{ ["--i" as string]: i } as React.CSSProperties}>
                        <span className="ft-card-t">{p.title}</span>
                        <span className="ft-card-s">{p.hits} of the skills you named</span>
                        <span aria-hidden="true" className="ft-card-a">{'→'}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <details className="ft-text-box">
                <summary>What I found in your text</summary>
                <p className="ft-copy"><Marked text={scanned.current} fit={fit} scanning={false} /></p>
                <p className="hr-note">This is keyword matching, not AI: it looks for {SKILLS.length} named technologies and skills and compares them with my resume.</p>
              </details>

              <div className="ft-actions">
                <button type="button" className="hr-btn is-main" onClick={talk}><span>Talk about this role</span><span aria-hidden="true">{'→'}</span></button>
                <button type="button" className="hr-btn" onClick={copy}>{copied ? "Copied" : "Copy summary"}</button>
                <button type="button" className="hr-btn" onClick={again}>Check another</button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
