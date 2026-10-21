"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resume, RESUME_PDF } from "@/lib/resume";
import { SITE_URL } from "@/lib/site";
import { BUGS, squashedList } from "@/lib/bugs";
import { play } from "@/lib/sound";
import "./receipt.css";

/* The receipt resume. `print` in the secret terminal (or asking the avatar to print it) prints the
   resume out like a shop receipt: line by line from a slot at the bottom of the screen, the way a
   till does it, then a button to tear it off or download the real PDF. Every word comes from
   lib/resume.ts, the same facts as the resume page, so it can never disagree with it.

   With Reduce Motion on, the whole receipt is just there at once. */

const W = 38; // characters per line

const center = (s: string) => " ".repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s;
const rule = (c = "-") => c.repeat(W);
const two = (a: string, b: string) => a + " ".repeat(Math.max(1, W - a.length - b.length)) + b;

/* Word-wrap to the receipt's width: `first` starts the first line, `hang` the ones after it */
function wrap(text: string, first: string, hang: string): string[] {
  const out: string[] = [];
  let line = first;
  let hasWord = false;
  for (const w of text.split(/\s+/)) {
    if (hasWord && line.length + 1 + w.length > W) { out.push(line); line = hang + w; }
    else line = hasWord ? `${line} ${w}` : line + w;
    hasWord = true;
  }
  if (hasWord) out.push(line);
  return out;
}

function buildLines(now: Date): string[] {
  const r = resume;
  const when = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const L: string[] = [];
  // The title on two balanced lines: "FULL-STACK DEVELOPER AND" / "QA AUTOMATION ENGINEER"
  const title = r.title.toUpperCase();
  const at = title.indexOf(" AND ");
  L.push("", center(r.name.toUpperCase()), ...(at > 0 ? [title.slice(0, at + 4), title.slice(at + 5)] : [title]).map(center));
  L.push(center(r.location.toUpperCase()), "", rule("="));
  L.push(two("ORDER #0001", when), two("SERVER: ZAKA", "TERMINAL 01"), rule());
  L.push(two("QTY  ITEM", "YEAR"));
  for (const e of r.experience) {
    L.push(two(` 1   ${e.role.toUpperCase()}`.slice(0, W - 6), e.period), `     ${e.org.toUpperCase()}`);
  }
  for (const e of r.education) {
    L.push(two(` 1   ${e.degree.toUpperCase()}`.slice(0, W - 6), e.period.replace(/\D/g, "")), `     ${e.school.toUpperCase()} (STARTED)`);
  }
  L.push(rule(), "BUILT AND SHIPPED");
  for (const p of r.projects) L.push(...wrap(`${p.name.toUpperCase()} - ${p.meta}`, " * ", "   "));
  L.push(rule(), "TOOLS OF THE TRADE");
  for (const s of r.skills) {
    L.push(` ${s.group.toUpperCase()}`);
    L.push(...wrap(s.items, "   ", "   "));
  }
  L.push(rule("="));
  const bugs = squashedList().length;
  L.push(two("SUBTOTAL", "ONE DEVELOPER"), two("TAX", "NONE"));
  if (bugs > 0) L.push(two("BUGS SQUASHED", `${bugs} OF ${BUGS.length}`));
  if (bugs >= BUGS.length) L.push(two("DISCOUNT", "QA CERTIFIED"));
  L.push(two("TOTAL", "OPEN FOR WORK"), rule("="));
  L.push("PAID BY: CURIOSITY", "", center("THANK YOU FOR VISITING"), center("COME BACK ANY TIME"), "");
  return L;
}

/* A barcode-looking strip. Decorative: it is drawn from the email's characters, not a real code. */
function bars(seed: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < 46; i++) {
    const c = seed.charCodeAt(i % seed.length) + i * 7;
    out.push(1 + (c % 3), 1 + ((c >> 2) % 2));
  }
  return out;
}

export default function Receipt() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [tearing, setTearing] = useState(false);
  const calm = useRef(false);
  const tearingRef = useRef(false);
  const paper = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>([]);

  const email = resume.contact[0].label;
  const site = SITE_URL.replace(/^https?:\/\//, "");
  const barcode = useMemo(() => bars(email), [email]);

  useEffect(() => {
    const onStart = () => {
      if (open) return;
      calm.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const l = buildLines(new Date());
      setLines(l);
      setShown(calm.current ? l.length : 0);
      setDone(calm.current);
      setTearing(false);
      tearingRef.current = false;
      setOpen(true);
    };
    window.addEventListener("zk-receipt", onStart);
    return () => window.removeEventListener("zk-receipt", onStart);
  }, [open]);

  // The till: one line at a time, with a tick for each
  useEffect(() => {
    if (!open || done || calm.current) return;
    if (shown >= lines.length) { setDone(true); return; }
    const id = window.setTimeout(() => {
      setShown((n) => n + 1);
      if (lines[shown].trim()) play("tick");
    }, shown < 6 ? 120 : 62);
    return () => window.clearTimeout(id);
  }, [open, done, shown, lines]);

  // Finished: show it from the top so it reads like a page
  useEffect(() => { if (done && paper.current) paper.current.scrollTop = 0; }, [done]);

  const tear = useCallback(() => {
    if (tearingRef.current) return;
    tearingRef.current = true;
    play("tear");
    setTearing(true);
    window.setTimeout(() => { setOpen(false); setTearing(false); }, calm.current ? 160 : 520);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") tear(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, tear]);

  // A tap while it is still printing finishes it at once
  const finishNow = () => { setShown(lines.length); setDone(true); };

  if (!open) return null;

  return (
    <div className="rc-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) { if (done) tear(); else finishNow(); } }}>
      <div className={`rc-wrap${tearing ? " is-tearing" : ""}`}>
        <div
          ref={paper}
          className={`rc-paper${done ? " is-done" : ""}`}
          role="dialog"
          aria-label="Resume receipt"
          onClick={() => { if (!done) finishNow(); }}
        >
          <div className="rc-lines">
            {lines.slice(0, shown).map((l, i) => <div className="rc-line" key={i}>{l || " "}</div>)}
            {shown >= lines.length && (
              <>
                <div className="rc-bars" aria-hidden="true">
                  {barcode.map((w, i) => <i key={i} style={{ width: w * 2, marginRight: i % 2 ? 0 : 2 }} />)}
                </div>
                <div className="rc-line rc-small">{center(email)}</div>
                <div className="rc-line rc-small">{center(site)}</div>
              </>
            )}
          </div>
          {shown >= lines.length && (
            <>
              {/* Stays at the bottom of the paper while a long receipt is scrolled (phones) */}
              <div className="rc-actions">
                <a className="rc-btn is-main" href={RESUME_PDF} download>Download PDF</a>
                <button type="button" className="rc-btn" onClick={tear}>Tear off</button>
              </div>
              <div className="rc-zig" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="rc-slot" aria-hidden="true"><i /></div>
      </div>
    </div>
  );
}
