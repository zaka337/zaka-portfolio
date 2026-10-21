"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { pickVoice } from "@/lib/speech";
import "./access.css";

/* The reading and access toolbar: a small "Aa" button on every page that opens a panel with
   bigger text, an easy-read font, higher contrast, a calm no-motion switch, and "read this page
   aloud" with the paragraph being read lit up as it goes.

   Choices are kept on the visitor's own device (zk-a11y) and put on <html> as attributes; the
   matching CSS is in app/globals.css. A script in the page head (app/layout.tsx) applies them
   before the first paint, so there is no flash, and for calm mode it also tells every motion
   check on the site ("prefers reduced motion") that the answer is yes. Calm mode therefore needs
   a reload to reach the parts of the page that are decided at load, like the 3D head.

   Reading aloud uses the browser's own voice: nothing is sent anywhere. */

interface Prefs { text: 0 | 1 | 2 | 3; easy: boolean; contrast: boolean; calm: boolean }
const KEY = "zk-a11y";
const NONE: Prefs = { text: 0, easy: false, contrast: false, calm: false };

function load(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Prefs>;
    const text = raw.text === 1 || raw.text === 2 || raw.text === 3 ? raw.text : 0;
    return { text, easy: !!raw.easy, contrast: !!raw.contrast, calm: !!raw.calm };
  } catch {
    return NONE;
  }
}

function paint(p: Prefs) {
  const h = document.documentElement;
  if (p.text) h.setAttribute("data-text", String(p.text)); else h.removeAttribute("data-text");
  h.toggleAttribute("data-easy", p.easy);
  h.toggleAttribute("data-contrast", p.contrast);
  h.toggleAttribute("data-calm", p.calm);
}

const SIZES: { v: Prefs["text"]; label: string; name: string }[] = [
  { v: 0, label: "A", name: "Normal text" },
  { v: 1, label: "A", name: "Larger text" },
  { v: 2, label: "A", name: "Large text" },
  { v: 3, label: "A", name: "Largest text" },
];
const RATES = [0.8, 1, 1.25, 1.5];

type Phase = "idle" | "reading" | "paused";

/* The blocks of the page worth reading, in order: headings, paragraphs, list items. Only the
   innermost ones (an item that holds a paragraph would be read twice), only the ones a person can
   see, and never this panel, the terminal or the navigation. */
function readableBlocks(): HTMLElement[] {
  const root = document.querySelector("main") ?? document.body;
  const sel = "h1,h2,h3,h4,p,li,dt,dd,blockquote,figcaption";
  const all = Array.from(root.querySelectorAll<HTMLElement>(sel));
  return all.filter((n) => {
    if (n.closest("[aria-hidden='true'], .ax-root, .zt-window, nav, script, style, [hidden]")) return false;
    if (n.querySelector(sel)) return false;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = n.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    return n.innerText.replace(/\s+/g, " ").trim().length > 1;
  });
}

export default function Access() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(NONE);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pos, setPos] = useState({ i: 0, n: 0 });
  const [rate, setRate] = useState(1);
  const [canSpeak, setCanSpeak] = useState(true);
  const [reloading, setReloading] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const blocks = useRef<HTMLElement[]>([]);
  const idx = useRef(0);
  const run = useRef(0);        // bumped to cancel whatever is being read
  const safety = useRef(0);
  const rateRef = useRef(1);
  const lit = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setPrefs(load());
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined");
  }, []);
  useEffect(() => { rateRef.current = rate; }, [rate]);

  const update = (next: Prefs) => {
    setPrefs(next);
    paint(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage refused: it still applies now */ }
  };

  const unlight = () => { lit.current?.classList.remove("ax-reading"); lit.current = null; };

  const stop = useCallback(() => {
    run.current++;
    window.clearTimeout(safety.current);
    try { window.speechSynthesis?.cancel(); } catch { /* none */ }
    unlight();
    setPhase("idle");
  }, []);

  const speakFrom = useCallback((from: number) => {
    const token = ++run.current;
    window.clearTimeout(safety.current);
    try { window.speechSynthesis.cancel(); } catch { /* none */ }
    const list = blocks.current;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const step = (i: number) => {
      if (token !== run.current) return;
      if (i >= list.length) { stop(); return; }
      idx.current = i;
      setPos({ i: i + 1, n: list.length });
      unlight();
      const el = list[i];
      el.classList.add("ax-reading");
      lit.current = el;
      el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });

      const text = el.innerText.replace(/\s+/g, " ").trim();
      let done = false;
      const next = () => { if (done || token !== run.current) return; done = true; window.clearTimeout(safety.current); step(i + 1); };
      try {
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
        u.rate = rateRef.current;
        u.onend = next;
        u.onerror = next;
        window.speechSynthesis.speak(u);
        // Some phones never say an utterance has ended
        safety.current = window.setTimeout(next, Math.max(3500, (text.length * 95) / rateRef.current));
      } catch {
        next();
      }
    };
    setPhase("reading");
    step(from);
  }, [stop]);

  const play = () => {
    // Called from the tap, which is what lets a phone speak at all
    if (phase === "paused") { speakFrom(idx.current); return; }
    blocks.current = readableBlocks();
    if (!blocks.current.length) return;
    // The first block on screen, so it starts where the visitor is looking
    const top = blocks.current.findIndex((b) => b.getBoundingClientRect().bottom > 80);
    speakFrom(top < 0 ? 0 : top);
  };
  const pause = () => {
    run.current++;
    window.clearTimeout(safety.current);
    try { window.speechSynthesis.cancel(); } catch { /* none */ }
    setPhase("paused");
  };

  // Reading belongs to one page: moving on ends it
  useEffect(() => { stop(); setOpen(false); }, [pathname, stop]);
  useEffect(() => () => stop(), [stop]);

  // Esc closes the panel; a tap outside it does too
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) window.setTimeout(() => panel.current?.querySelector<HTMLElement>("button, input")?.focus(), 30);
  }, [open]);

  const setCalm = (on: boolean) => {
    update({ ...prefs, calm: on });
    // Part of the page is decided when it loads (the 3D head, the scroll stories): start again so all of it is calm
    setReloading(true);
    window.setTimeout(() => window.location.reload(), 700);
  };

  const dirty = prefs.text !== 0 || prefs.easy || prefs.contrast || prefs.calm;
  const reset = () => {
    const hadCalm = prefs.calm;
    update(NONE);
    stop();
    if (hadCalm) { setReloading(true); window.setTimeout(() => window.location.reload(), 700); }
  };

  return (
    <div className="ax-root" data-route={pathname === "/" ? "home" : "page"}>
      <button
        ref={btn}
        type="button"
        className={`ax-btn${open ? " is-open" : ""}${dirty ? " is-set" : ""}`}
        aria-label="Reading and accessibility options"
        aria-expanded={open}
        aria-controls="ax-panel"
        title="Reading and accessibility"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" className="ax-glyph">A<small>a</small></span>
      </button>

      {open && (
        <div ref={panel} id="ax-panel" className="ax-panel" role="dialog" aria-label="Reading and accessibility options">
          <div className="ax-head">
            <span className="ax-title">Reading {'&'} access</span>
            <button type="button" className="ax-x" aria-label="Close" onClick={() => { setOpen(false); btn.current?.focus(); }}>{'×'}</button>
          </div>

          <div className="ax-row">
            <span className="ax-label" id="ax-l-text">Text size</span>
            <div className="ax-sizes" role="group" aria-labelledby="ax-l-text">
              {SIZES.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  className="ax-size"
                  data-size={s.v}
                  aria-pressed={prefs.text === s.v}
                  aria-label={s.name}
                  onClick={() => update({ ...prefs, text: s.v })}
                >
                  <span aria-hidden="true">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Switch label="Easy-read font" hint="Clear letters, more space" on={prefs.easy} onChange={(v) => update({ ...prefs, easy: v })} />
          <Switch label="High contrast" hint="Stronger text and lines" on={prefs.contrast} onChange={(v) => update({ ...prefs, contrast: v })} />
          <Switch label="Calm mode" hint={reloading ? "Reloading..." : "No motion. Reloads the page"} on={prefs.calm} onChange={setCalm} />

          <div className="ax-row ax-read">
            <span className="ax-label" id="ax-l-read">Read this page aloud</span>
            {canSpeak ? (
              <>
                <div className="ax-controls" role="group" aria-labelledby="ax-l-read">
                  {phase === "reading" ? (
                    <button type="button" className="ax-ctl is-main" onClick={pause} aria-label="Pause reading">
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
                    </button>
                  ) : (
                    <button type="button" className="ax-ctl is-main" onClick={play} aria-label={phase === "paused" ? "Continue reading" : "Start reading"}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>
                    </button>
                  )}
                  <button type="button" className="ax-ctl" onClick={stop} disabled={phase === "idle"} aria-label="Stop reading">
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" /></svg>
                  </button>
                  <span className={`ax-eq${phase === "reading" ? " is-on" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>
                  <span className="ax-pos" aria-live="polite">{phase === "idle" ? "" : `${pos.i} of ${pos.n}`}</span>
                </div>
                <div className="ax-rates" role="group" aria-label="Reading speed">
                  {RATES.map((r) => (
                    <button key={r} type="button" className="ax-rate" aria-pressed={rate === r} onClick={() => setRate(r)}>{r}{'×'}</button>
                  ))}
                </div>
              </>
            ) : (
              <span className="ax-note">This browser has no voice to read with.</span>
            )}
          </div>

          <button type="button" className="ax-reset" onClick={reset} disabled={!dirty && phase === "idle"}>Reset everything</button>
        </div>
      )}
    </div>
  );
}

function Switch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="ax-row ax-switch" onClick={() => onChange(!on)}>
      <span className="ax-switch-text">
        <span className="ax-label">{label}</span>
        <span className="ax-hint">{hint}</span>
      </span>
      <span className="ax-track" aria-hidden="true"><i /></span>
    </button>
  );
}
