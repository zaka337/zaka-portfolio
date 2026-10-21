"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import "./transition.css";

/* Changing page is a small piece of theatre. A paper curtain slides up over the page, the name of
   the place you are going to is assembled from tumbling letters on it, the next page loads behind
   it, and then the letters fly away and the curtain lifts to show it.

   It takes over ordinary clicks on links to other pages of this site (and `zk-go`, which the
   search panel sends). It leaves alone: a click with Ctrl, Cmd, Shift or Alt or the middle button
   (those open a new tab), links that open a new tab or download, outside links, the same page
   (including a #part of it), files and server routes, links inside the terminal, tour and similar
   panels that already navigate themselves, and anything marked data-no-tx. The browser's Back and
   Forward buttons are not touched. With Reduce Motion or calm mode it does nothing at all and the
   page changes the normal way.

   Timing (about 0.9 s on a fast page): the curtain covers for 0.4 s, the route changes while it is
   covered, and the letters hold until the new page has appeared. If the new page is slow, the
   curtain lifts after 4 seconds anyway. */

const COVER_MS = 380;   // the curtain reaches the top
const MIN_MS = 700;     // never lift before the letters have assembled
const OUT_MS = 640;     // letters away and the curtain up
const GIVE_UP_MS = 4200;

const LABELS: Record<string, string> = {
  "/": "HOME", "/about": "ABOUT", "/projects": "PROJECTS", "/projects/all": "ALL REPOS", "/resume": "RESUME",
  "/hire": "HIRE", "/tldr": "TL;DR", "/qa-challenge": "BREAK IT", "/contact-me": "LET'S WORK", "/contact": "SAY HI",
};
const labelFor = (path: string) =>
  LABELS[path] ?? PROJECTS.find((p) => `/projects/${p.slug}` === path)?.title.toUpperCase() ??
  (path.split("/").filter(Boolean).pop() ?? "").replace(/-/g, " ").toUpperCase();

// Fixed scatter for each letter (no randomness while drawing): -1..1
const jitter = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

const SKIP_INSIDE = "[data-no-tx], .zt-window, .tr-card, .rc-backdrop, .xr-layer, .ax-panel";
const calmNow = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Run { label: string; phase: "in" | "out" }

export default function Transition() {
  const router = useRouter();
  const pathname = usePathname();
  const [run, setRun] = useState<Run | null>(null);
  const busy = useRef(false);
  const want = useRef("");
  const t0 = useRef(0);
  const pushed = useRef(false);
  const lifting = useRef(false);
  const timers = useRef<number[]>([]);
  const here = useRef(pathname);
  const lift = useRef<() => void>(() => {});

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => { here.current = pathname; }, [pathname]);

  // The page has changed to where we were going: lift the curtain once the letters have had their moment
  useEffect(() => {
    if (!busy.current || !pushed.current || lifting.current || pathname !== want.current) return;
    const wait = Math.max(0, MIN_MS - (performance.now() - t0.current)) + 120;
    later(() => lift.current(), wait);
  }, [pathname]);

  useEffect(() => {
    lift.current = () => {
      if (lifting.current || !busy.current) return;
      lifting.current = true;
      setRun((r) => (r ? { ...r, phase: "out" } : r));
      later(() => { setRun(null); busy.current = false; lifting.current = false; pushed.current = false; }, OUT_MS);
    };

    const start = (href: string) => {
      const u = new URL(href, window.location.href);
      busy.current = true;
      lifting.current = false;
      pushed.current = false;
      want.current = u.pathname;
      t0.current = performance.now();
      setRun({ label: labelFor(u.pathname), phase: "in" });
      // The route changes while the curtain is already covering the page
      later(() => { pushed.current = true; router.push(u.pathname + u.search + u.hash); }, COVER_MS - 40);
      later(() => lift.current(), GIVE_UP_MS);
    };

    const leaves = (u: URL) =>
      u.origin !== window.location.origin || u.pathname === here.current ||
      /^\/(api|whatsapp|_next)(\/|$)/.test(u.pathname) || /\.[a-z0-9]{2,5}$/i.test(u.pathname);

    const onClick = (e: MouseEvent) => {
      if (busy.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (calmNow()) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.closest(SKIP_INSIDE)) return;
      let u: URL;
      try { u = new URL(a.href, window.location.href); } catch { return; }
      if (leaves(u)) return;
      e.preventDefault(); // Next's own link handling sees this and stands aside
      start(u.pathname + u.search + u.hash);
    };

    // The search panel (and anything else that wants the curtain) asks with zk-go
    const onGo = (e: Event) => {
      if (busy.current || calmNow()) return;
      const href = (e as CustomEvent<{ href: string }>).detail?.href;
      if (!href) return;
      const u = new URL(href, window.location.href);
      if (leaves(u)) return;
      e.preventDefault();
      start(u.pathname + u.search + u.hash);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("zk-go", onGo);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("zk-go", onGo);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!run) return null;
  const letters = run.label.split("");
  const n = letters.length;
  return (
    <div className="tx" data-phase={run.phase} aria-hidden="true">
      <div className="tx-word" style={{ ["--n" as string]: n, ["--step" as string]: `${Math.min(22, 240 / Math.max(1, n))}ms` } as React.CSSProperties}>
        {letters.map((ch, i) => (
          <span
            key={i}
            className="tx-ch"
            style={{
              ["--i" as string]: i,
              ["--x" as string]: jitter(i, 1).toFixed(3),
              ["--y" as string]: jitter(i, 2).toFixed(3),
              ["--r" as string]: (jitter(i, 3) * 80).toFixed(0),
            } as React.CSSProperties}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
      </div>
    </div>
  );
}
