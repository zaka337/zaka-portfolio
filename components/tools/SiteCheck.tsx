"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";
import { SITE_URL } from "@/lib/site";
import { SITEPULSE } from "@/lib/sitepulseLinks";
import { formatMarkdown } from "@/lib/sitepulse/report";
import { CATEGORIES, type Category, type CheckResult, type Report } from "@/lib/sitepulse/types";
import "./sitecheck.css";

/* /tools/site-check: paste a web address, get the sitepulse report. The scan runs on the server (/api/site-check),
   because a browser cannot fetch other sites' headers; everything else here is presentation. Nothing is stored. */

const TITLE: Record<Category, string> = { security: "Security", seo: "SEO and content", performance: "Performance", accessibility: "Accessibility", links: "Links" };
const TAG: Record<CheckResult["status"], string> = { pass: "PASS", warn: "IMPROVE", fail: "FAIL", skip: "SKIPPED" };
const EXAMPLES = ["example.com", new URL(SITE_URL).host];
const R = 70;
const C = 2 * Math.PI * R;

type Phase = "idle" | "running" | "done" | "error";

const hostOf = (u: string) => { try { return new URL(u).host; } catch { return u; } };

export default function SiteCheck() {
  useScrollUnlock();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // /tools/site-check?url=example.com fills the box (it does not start a scan by itself: a link should not make the server fetch things)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("url");
      if (q) setUrl(q.slice(0, 300));
    } catch { /* an empty box is fine */ }
    return () => abortRef.current?.abort();
  }, []);

  const run = useCallback(async (target: string) => {
    const value = target.trim();
    if (!value) { inputRef.current?.focus(); return; }
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; ctl.abort(); }, 28000);
    setPhase("running");
    setError("");
    setCopied(null);
    try {
      const res = await fetch("/api/site-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value }), signal: ctl.signal });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setReport(data.report as Report);
        setPhase("done");
      } else {
        setError(typeof data?.message === "string" ? data.message : "The check could not be completed. Please try again.");
        setPhase("error");
      }
    } catch {
      if (ctl.signal.aborted && !timedOut) return; // replaced by a newer check
      setError(timedOut ? "That took too long. The site may be very slow, or not answering." : "Could not reach the checker. Check your connection and try again.");
      setPhase("error");
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  // When a result (or an error) arrives, bring it into view and give it keyboard focus so screen readers announce it
  useEffect(() => {
    if (phase !== "done" && phase !== "error") return;
    const el = resultRef.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.focus({ preventScroll: true });
    // scroll the whole section (it keeps clear of the sticky bar), not just the heading, which would end up under it
    (el.closest("section") ?? el).scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  }, [phase, report]);

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 2200);
    } catch {
      setCopied(null);
    }
  };

  return (
    <main className="sc-root">
      <nav className="sc-nav">
        <Link href="/tools">{'← '}ALL TOOLS</Link>
        <span>SITE HEALTH CHECK</span>
        <Link href="/contact-me">BRIEF {'↗'}</Link>
      </nav>

      <header className="sc-hero">
        <p className="sc-micro">FREE TOOL {'·'} NO ACCOUNT {'·'} NOTHING STORED</p>
        <h1 className="sc-h1">
          <span>Check any</span>
          <span>website.</span>
        </h1>
        <p className="sc-lead">35 automatic checks of the things that quietly cost sites visitors and trust: security headers, search basics, speed hints, accessibility basics and broken links. Paste an address, get a score and a fix for every problem.</p>

        <form className="sc-form" onSubmit={(e) => { e.preventDefault(); void run(url); }} noValidate>
          <label className="sc-micro" htmlFor="sc-url">WEB ADDRESS</label>
          <div className="sc-row">
            <input
              id="sc-url"
              ref={inputRef}
              className="sc-input"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              placeholder="your-site.com"
              value={url}
              maxLength={300}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="sc-btn is-main" type="submit" disabled={phase === "running"}>{phase === "running" ? "Checking..." : "Run the check"}</button>
          </div>
          <div className="sc-eg">
            <span className="sc-micro">TRY</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="sc-chip" disabled={phase === "running"} onClick={() => { setUrl(ex); void run(ex); }}>{ex}</button>
            ))}
          </div>
          <p className="sc-note">Public websites only. It makes about twenty requests (the page, robots.txt, the sitemap and a sample of links), introduces itself as sitepulse, and keeps no record of what you check.</p>
        </form>
      </header>

      <div className="sc-body" aria-live="polite">
        {phase === "running" && (
          <section className="sc-run" aria-label="Checking">
            <p className="sc-micro">WORKING</p>
            <p className="sc-run-t">Checking {hostOf(url.includes("://") ? url : `https://${url.trim()}`)}</p>
            <div className="sc-sweep" aria-hidden="true"><i /></div>
            <p className="sc-note">Fetching the page, its headers, robots.txt, the sitemap and a few links. This usually takes a few seconds.</p>
          </section>
        )}

        {phase === "error" && (
          <section className="sc-err" role="alert">
            <p className="sc-micro">COULD NOT CHECK</p>
            <h2 className="sc-h2" tabIndex={-1} ref={resultRef}>{error}</h2>
          </section>
        )}

        {phase === "done" && report && <Result report={report} headingRef={resultRef} copied={copied} onCopy={() => copy("md", formatMarkdown(report))} onAgain={() => { setPhase("idle"); inputRef.current?.focus(); window.scrollTo({ top: 0 }); }} />}
      </div>

      <section className="sc-more">
        <p className="sc-micro">UNDER THE HOOD</p>
        <h2 className="sc-h2">Open source, and an assistant can use it too.</h2>
        <p className="sc-lead">This page runs sitepulse, a small scanner I wrote. It reads the HTML your server sends and judges it against common good practice. It does not run JavaScript or measure rendering speed, and no automatic check can prove a site is secure or accessible, so treat a warning as a prompt to look, not a verdict.</p>
        {SITEPULSE.published ? (
          <div className="sc-cmds">
            <Cmd label="Command line" text={SITEPULSE.cli} copied={copied === "cli"} onCopy={() => copy("cli", SITEPULSE.cli)} />
            <Cmd label="Claude Code (MCP server)" text={SITEPULSE.mcp} copied={copied === "mcp"} onCopy={() => copy("mcp", SITEPULSE.mcp)} />
            <p className="sc-note"><a href={SITEPULSE.repo} target="_blank" rel="noopener noreferrer">Source on GitHub</a>{' · '}<a href={SITEPULSE.npm} target="_blank" rel="noopener noreferrer">npm package</a></p>
          </div>
        ) : SITEPULSE.onGitHub ? (
          <p className="sc-note"><a href={SITEPULSE.repo} target="_blank" rel="noopener noreferrer">Source on GitHub</a>{'. '}It is not on npm yet, so for now you run it from a copy of the repository (the README shows how). The npm package, which makes the command-line tool and the MCP server (so an AI assistant can run these checks) a one-line install, is coming.</p>
        ) : (
          <p className="sc-note">The command-line tool and the MCP server (so an AI assistant can run these checks) are being published.</p>
        )}
      </section>

      <footer className="sc-foot">
        <p>Want someone to fix what it finds? <Link href="/services#audit">See how I can help</Link>{', or '}<Link href="/contact-me">send a project brief</Link>{'.'} More free tools: <Link href="/tools">all tools</Link>{'.'}</p>
      </footer>
    </main>
  );
}

function Cmd({ label, text, copied, onCopy }: { label: string; text: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="sc-cmd">
      <span className="sc-micro">{label.toUpperCase()}</span>
      <div className="sc-cmd-row">
        <code>{text}</code>
        <button type="button" className="sc-chip" onClick={onCopy}>{copied ? "Copied" : "Copy"}</button>
      </div>
    </div>
  );
}

function Result({ report, headingRef, copied, onCopy, onAgain }: { report: Report; headingRef: React.RefObject<HTMLHeadingElement | null>; copied: string | null; onCopy: () => void; onAgain: () => void }) {
  const issues = [...report.results.filter((r) => r.status === "fail"), ...report.results.filter((r) => r.status === "warn")];
  const unreachable = report.notes.some((n) => n.startsWith("The scan stopped"));
  return (
    <section className="sc-result" aria-label="Results">
      <div className="sc-head">
        <div className="sc-ring" role="img" aria-label={`Score ${report.score} out of 100, grade ${report.grade}`}>
          <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
            <circle className="sc-ring-bg" cx="80" cy="80" r={R} />
            <circle className="sc-ring-fg" cx="80" cy="80" r={R} transform="rotate(-90 80 80)" style={{ "--c": C, "--o": C * (1 - report.score / 100) } as React.CSSProperties} />
          </svg>
          <span className="sc-pct">{report.score}</span>
        </div>
        <div className="sc-verdict">
          <p className="sc-micro">{unreachable ? "COULD NOT LOAD THE PAGE" : "RESULT"}</p>
          <h2 className="sc-grade" tabIndex={-1} ref={headingRef}>Grade {report.grade}</h2>
          <p className="sc-meta">{report.finalUrl}</p>
          <p className="sc-counts">
            <b>{report.summary.pass}</b> passed {'·'} <b>{report.summary.warn}</b> to improve {'·'} <b>{report.summary.fail}</b> failed {'·'} <b>{report.summary.skip}</b> skipped {'·'} {(report.durationMs / 1000).toFixed(1)} s
          </p>
          <div className="sc-acts">
            <button type="button" className="sc-btn is-main" onClick={onCopy}>{copied === "md" ? "Copied" : "Copy as Markdown"}</button>
            <button type="button" className="sc-btn" onClick={onAgain}>Check another</button>
          </div>
        </div>
      </div>

      <div className="sc-cats">
        {CATEGORIES.map((cat) => {
          const k = report.categories[cat];
          if (k.pass + k.warn + k.fail + k.skip === 0) return null;
          return (
            <div key={cat} className="sc-cat">
              <span className="sc-micro">{TITLE[cat].toUpperCase()}</span>
              <b className="sc-cat-n">{k.score === null ? "n/a" : k.score}</b>
              <i className="sc-bar" aria-hidden="true"><i style={{ width: `${k.score ?? 0}%` }} /></i>
              <span className="sc-cat-c">{k.fail} failed {'·'} {k.warn} to improve</span>
            </div>
          );
        })}
      </div>

      {issues.length > 0 ? (
        <div className="sc-fix">
          <p className="sc-micro">WHAT TO FIX FIRST</p>
          <ol className="sc-list">
            {issues.map((r) => (
              <li key={r.id} className="sc-item">
                <div className="sc-item-h"><Tag status={r.status} /><h3 className="sc-item-t">{r.title}</h3></div>
                <p className="sc-item-m">{r.message}</p>
                {r.fix && <p className="sc-item-f"><b>Fix:</b> {r.fix}</p>}
                {r.details && r.details.length > 0 && (
                  <ul className="sc-det">{r.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        !unreachable && <p className="sc-lead">Nothing to fix among the things this tool checks.</p>
      )}

      <div className="sc-all">
        <p className="sc-micro">EVERYTHING THAT WAS CHECKED</p>
        {CATEGORIES.map((cat) => {
          const rows = report.results.filter((r) => r.category === cat);
          if (!rows.length) return null;
          return (
            <details key={cat} className="sc-grp">
              <summary>{TITLE[cat]} <span className="sc-faint">{rows.length} {rows.length === 1 ? "check" : "checks"}</span></summary>
              <ul className="sc-rows">
                {rows.map((r) => (
                  <li key={r.id}><Tag status={r.status} /><span><b>{r.title}.</b> {r.message}</span></li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>

      {report.notes.length > 0 && (
        <ul className="sc-notes">{report.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      )}
    </section>
  );
}

function Tag({ status }: { status: CheckResult["status"] }) {
  return <span className={`sc-tag is-${status}`}>{TAG[status]}</span>;
}
