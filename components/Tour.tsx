"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { found } from "@/lib/secrets";
import "./tour.css";

/* The sixty-second tour. Run `tour` in the secret terminal, or ask the avatar for a tour. It walks
   the visitor through the site, page by page: a short line at the bottom, and a soft spotlight on
   the thing it is talking about. It only ever opens this site's own pages and never changes
   anything on them. Tap Stop, press Esc, or go somewhere yourself, and it ends at once.

   With Reduce Motion on it is a slide show you drive yourself: no timer, no smooth scrolling. */

interface Step {
  path: string;
  target?: string;        // what to spotlight, if it is on the page
  title: string;
  text: string;
  ms: number;             // how long it stays when nobody taps Next
  say?: string;           // a word from the avatar (home only)
}

/* Text is plain ASCII on purpose (see the SWC note in the project memory); the pages are the
   site's real ones, so if one is renamed, update it here. */
const STEPS: Step[] = [
  { path: "/", target: ".block-tl", title: "Hello", ms: 8500, say: "HELLO.",
    text: "I am Zaka Ullah Waheed, a full-stack developer and QA automation engineer from Islamabad. This is a one minute walk around." },
  { path: "/about", target: ".st-hero-name", title: "The story", ms: 9000,
    text: "My story is told as you scroll: where I started, what I build with, and what I am learning now." },
  { path: "/projects", target: ".pj-hero", title: "The work", ms: 9000,
    text: "Six projects, most of them live. Each opens into a case study: the goal, what I built, the stack and the outcome." },
  { path: "/projects/qa-with-zaka", target: ".lp", title: "Proof, not promises", ms: 10000,
    text: "Every case study ends with a button that checks the live site and the code while you watch. You do not have to take my word." },
  { path: "/contact-me", target: ".cm-brief-head", title: "Work together", ms: 9000,
    text: "Got something to build or test? Start with this brief and tell me about it." },
  { path: "/", title: "That was the minute", ms: 8000, say: "BYE. FOR NOW.",
    text: "A few things on this site are hidden. Finding them is up to you." },
];

interface Box { x: number; y: number; w: number; h: number }

const PAD = 8;

function measure(el: Element): Box {
  const r = el.getBoundingClientRect();
  const x = Math.max(6, r.left - PAD);
  const y = Math.max(6, r.top - PAD);
  const right = Math.min(innerWidth - 6, r.right + PAD);
  const bottom = Math.min(innerHeight - 6, r.bottom + PAD);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

export default function Tour() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  const [armed, setArmed] = useState(false);   // the step's timer is running (drives the progress bar)
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false); // Reduce Motion: the visitor turns the pages

  const pathRef = useRef(pathname);
  const stepRef = useRef(-1);
  const pushing = useRef<string | null>(null); // a page we sent the visitor to and are waiting for
  const manualRef = useRef(false);
  const timer = useRef(0);
  const left = useRef(0);
  const endsAt = useRef(0);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  const clearTimer = useCallback(() => { window.clearTimeout(timer.current); timer.current = 0; }, []);

  const stop = useCallback((finished = false) => {
    if (stepRef.current < 0) return;
    clearTimer();
    stepRef.current = -1;
    pushing.current = null;
    setStep(-1);
    setBox(null);
    setArmed(false);
    setPaused(false);
    if (finished) found("tour");
  }, [clearTimer]);

  const go = useCallback((i: number) => {
    if (i >= STEPS.length) { stop(true); return; }
    clearTimer();
    stepRef.current = i;
    setBox(null);
    setArmed(false);
    setPaused(false);
    setStep(i);
    const want = STEPS[i].path;
    if (pathRef.current !== want) {
      pushing.current = want;
      router.push(want);
    }
  }, [clearTimer, router, stop]);

  const arm = useCallback((ms: number, from: number) => {
    clearTimer();
    left.current = ms;
    endsAt.current = performance.now() + ms;
    timer.current = window.setTimeout(() => { if (stepRef.current === from) go(from + 1); }, ms);
  }, [clearTimer, go]);

  /* Triggers: the terminal's `tour` command and the avatar. Starting again while it runs ends it. */
  const goRef = useRef(go);
  const stopRef = useRef(stop);
  useEffect(() => { goRef.current = go; stopRef.current = stop; }, [go, stop]);
  useEffect(() => {
    const onStart = () => {
      if (stepRef.current >= 0) { stopRef.current(); return; }
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      manualRef.current = reduce;
      setManual(reduce);
      goRef.current(0);
    };
    window.addEventListener("zk-tour", onStart);
    return () => window.removeEventListener("zk-tour", onStart);
  }, []);

  /* Each step: wait for its page, find what to spotlight, then start its timer */
  useEffect(() => {
    if (step < 0) return;
    const s = STEPS[step];
    if (pathname !== s.path) {
      // Not where this step lives: either we are on our way there, or the visitor went elsewhere
      if (pushing.current !== s.path) stop();
      return;
    }
    pushing.current = null;

    let cancelled = false;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let onMove: (() => void) | null = null;
    let stopSettle: (() => void) | null = null;
    const t0 = performance.now();
    const reduce = manualRef.current;

    const begin = () => {
      if (cancelled) return;
      if (s.say && !reduce) window.dispatchEvent(new CustomEvent("zk-say", { detail: { text: s.say, ms: 2200 } }));
      if (s.path === "/" && !reduce) window.setTimeout(() => window.dispatchEvent(new Event("zk-nod")), 500);
      if (!manualRef.current) {
        setArmed(true);
        if (document.hidden) { left.current = s.ms; setPaused(true); } // starts when the tab is shown again
        else arm(s.ms, step);
      }
    };

    const show = (el: Element) => {
      if (cancelled) return;
      setBox(measure(el));
      // Keep the spotlight on it while the page scrolls, resizes or settles
      let pending = 0;
      onMove = () => {
        if (pending) return;
        pending = requestAnimationFrame(() => { pending = 0; if (!cancelled) setBox(measure(el)); });
      };
      window.addEventListener("scroll", onMove, { passive: true });
      window.addEventListener("resize", onMove);
      if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(onMove); ro.observe(el); }
      begin();
    };

    /* Wait until the page has stopped scrolling (or it never started), then call back */
    const settle = (then: () => void) => {
      let idle = 0;
      let cap = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(idle);
        window.clearTimeout(cap);
        window.removeEventListener("scroll", bump);
        if (!cancelled) then();
      };
      const bump = () => { window.clearTimeout(idle); idle = window.setTimeout(finish, 160); };
      window.addEventListener("scroll", bump, { passive: true });
      idle = window.setTimeout(finish, 450);
      cap = window.setTimeout(finish, 3500);
      stopSettle = () => { done = true; window.clearTimeout(idle); window.clearTimeout(cap); window.removeEventListener("scroll", bump); };
    };

    const place = () => {
      if (cancelled) return;
      const el = s.target ? document.querySelector(s.target) : null;
      if (s.target && !el && performance.now() - t0 < 4000) { raf = requestAnimationFrame(place); return; }
      if (!el) { begin(); return; }
      // Low on the page, where the card would sit on top of it: bring it up first, and light it
      // once the page has stopped moving
      const r = el.getBoundingClientRect();
      if (r.top > innerHeight * 0.5 || r.bottom < 40) {
        window.scrollTo({ top: Math.max(0, r.top + window.scrollY - innerHeight * 0.16), behavior: reduce ? "auto" : "smooth" });
        settle(() => show(el));
      } else show(el);
    };
    // A beat for the new page to draw itself
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(place); });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopSettle?.();
      if (onMove) {
        window.removeEventListener("scroll", onMove);
        window.removeEventListener("resize", onMove);
      }
      ro?.disconnect();
    };
  }, [step, pathname, arm, stop]);

  /* Esc ends it, the right arrow moves on; a hidden tab holds the timer so the tour is not lost */
  useEffect(() => {
    if (step < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") stop();
      else if (e.key === "ArrowRight") go(stepRef.current + 1);
    };
    const onVis = () => {
      if (manualRef.current || stepRef.current < 0 || !armed) return;
      if (document.hidden) {
        if (timer.current) left.current = Math.max(800, endsAt.current - performance.now());
        clearTimer();
        setPaused(true);
      } else {
        arm(left.current, stepRef.current);
        setPaused(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [step, armed, stop, go, arm, clearTimer]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (step < 0) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <>
      {box && box.w > 0 && (
        <div
          className="tr-spot"
          aria-hidden="true"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
      )}
      <section className={`tr-card${manual ? " is-manual" : ""}`} role="region" aria-label="Guided tour">
        {armed && (
          <div className="tr-bar" aria-hidden="true">
            <i key={step} className={paused ? "is-paused" : ""} style={{ animationDuration: `${s.ms}ms` }} />
          </div>
        )}
        <div className="tr-head">
          <span className="tr-count">Tour {'·'} {step + 1} of {STEPS.length}</span>
          <span className="tr-title">{s.title}</span>
        </div>
        <p className="tr-text" aria-live="polite">{s.text}</p>
        <div className="tr-actions">
          {!last && <button type="button" className="tr-btn" onClick={() => stop()}>Stop</button>}
          <button type="button" className="tr-btn is-main" onClick={() => go(step + 1)}>{last ? "Done" : "Next"}</button>
        </div>
      </section>
    </>
  );
}
