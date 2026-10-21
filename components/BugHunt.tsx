"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BUGS, bugFor, squash, squashedList } from "@/lib/bugs";
import { play } from "@/lib/sound";
import "./bughunt.css";

/* Bug hunt. On seven of the site's pages a tiny ink bug sometimes wanders across the screen, a few
   seconds after the page opens. Tap it (or click it) and it is squashed: "BUG-004 closed". Squash
   all seven and the ticket is resolved. A bug that is not squashed goes on its way, and may turn
   up again on a later visit (at most twice a visit). The progress is kept in the visitor's own
   browser (lib/bugs.ts); `bugs` in the secret terminal lists it.

   It never gets in the way: the bug is small, only the bug itself takes taps, and it waits while
   the tour, the page crumble or the receipt are on screen. With Reduce Motion it does not walk at
   all: it sits still near the edge of the page for a while, and can still be squashed. */

const SEEN = "zk-bugseen";

function timesSeen(id: string): number {
  try { return (JSON.parse(sessionStorage.getItem(SEEN) || "{}") as Record<string, number>)[id] ?? 0; } catch { return 0; }
}
function markSeen(id: string) {
  try {
    const m = JSON.parse(sessionStorage.getItem(SEEN) || "{}") as Record<string, number>;
    m[id] = (m[id] ?? 0) + 1;
    sessionStorage.setItem(SEEN, JSON.stringify(m));
  } catch { /* storage refused: it may just show up more often */ }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface Toast { head: string; sub: string; all: boolean }

export default function BugHunt() {
  const pathname = usePathname();
  const [bug, setBug] = useState<{ id: string; calm: boolean } | null>(null);
  const [splat, setSplat] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const toastTimer = useRef(0);

  useEffect(() => {
    setBug(null);
    setSplat(null);
    const target = bugFor(pathname);
    if (!target || squashedList().includes(target.id) || timesSeen(target.id) >= 2) return;

    let cancelled = false;
    let raf = 0;
    let wait = 0;

    // It waits for a quiet moment: not during the tour, the page crumble or the receipt
    const busy = () =>
      !!document.querySelector(".tr-card, .rc-backdrop") || document.documentElement.hasAttribute("data-crumble") || document.hidden;

    const appear = () => {
      if (cancelled) return;
      if (busy()) { wait = window.setTimeout(appear, 4000); return; }
      markSeen(target.id);
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      setBug({ id: target.id, calm });
    };
    wait = window.setTimeout(appear, rand(7000, 13000));

    return () => {
      cancelled = true;
      window.clearTimeout(wait);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  /* The walk: a few stops around the screen, then off the edge it came from or another one */
  useEffect(() => {
    if (!bug) return;
    const node = el.current;
    if (!node) return;
    let raf = 0;
    let gone = false;
    let timer = 0;
    const W = () => innerWidth;
    const H = () => innerHeight;

    const place = (x: number, y: number, heading: number) => {
      pos.current = { x, y };
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(heading + Math.PI / 2).toFixed(3)}rad)`;
    };
    const leave = () => {
      if (gone) return;
      gone = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      setBug(null);
    };

    if (bug.calm) {
      // Reduced motion: it stays put by the side of the page for a while, then goes
      const side = Math.random() < 0.5 ? 18 : W() - 46;
      place(side, rand(H() * 0.3, H() * 0.62), rand(-0.5, 0.5));
      node.dataset.moving = "0";
      timer = window.setTimeout(leave, 28000);
      return () => { gone = true; window.clearTimeout(timer); };
    }

    const margin = 40;
    const pts: { x: number; y: number; wait: number }[] = [];
    const stops = Math.round(rand(3, 5));
    for (let i = 0; i < stops; i++) pts.push({ x: rand(margin, W() - margin), y: rand(70, H() - 90), wait: rand(500, 1500) });
    // It comes in from one side and leaves by one
    const fromLeft = Math.random() < 0.5;
    const start = { x: fromLeft ? -40 : W() + 40, y: rand(H() * 0.2, H() * 0.8) };
    const end = { x: fromLeft ? W() + 60 : -60, y: rand(H() * 0.2, H() * 0.8), wait: 0 };
    pts.push(end);

    let { x, y } = start;
    let heading = Math.atan2(pts[0].y - y, pts[0].x - x);
    let i = 0;
    let pause = 0;
    let last = performance.now();
    const speed = matchMedia("(hover: none)").matches ? 38 : 52; // pixels a second: slow enough to catch with a finger
    place(x, y, heading);
    node.dataset.moving = "1";

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const p = pts[i];
      if (now < pause) { node.dataset.moving = "0"; return; }
      const dx = p.x - x, dy = p.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        if (i === pts.length - 1) { leave(); return; }
        pause = now + p.wait;
        i++;
        return;
      }
      const want = Math.atan2(dy, dx);
      const turn = wrapAngle(want - heading);
      heading += turn * Math.min(1, dt * 7);
      // It turns on the spot before it walks off, like a bug does
      if (Math.abs(turn) < 0.7) {
        x += Math.cos(heading) * speed * dt;
        y += Math.sin(heading) * speed * dt;
        node.dataset.moving = "1";
      } else node.dataset.moving = "0";
      place(x, y, heading);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [bug]);

  const showToast = (t: Toast) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), t.all ? 7000 : 3200);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const hit = (e: React.PointerEvent) => {
    if (!bug) return;
    e.preventDefault();
    e.stopPropagation();
    const b = BUGS.find((x) => x.id === bug.id);
    if (!b) return;
    const { x, y } = pos.current;
    setSplat({ x, y });
    setBug(null);
    play("squash");
    const n = squash(b.id);
    window.dispatchEvent(new CustomEvent("zk-bug", { detail: { id: b.id, count: n, total: BUGS.length } }));
    showToast(
      n >= BUGS.length
        ? { head: "All 7 bugs closed", sub: "Ticket resolved. QA approves.", all: true }
        : { head: `${b.no} closed`, sub: `${n} of ${BUGS.length}`, all: false },
    );
    window.setTimeout(() => setSplat(null), 2200);
  };

  return (
    <>
      {bug && (
        <div ref={el} className="bh-bug" data-moving="0" aria-hidden="true" onPointerDown={hit}>
          <svg viewBox="0 0 40 40" width="34" height="34" className="bh-svg">
            <g className="bh-legs bh-l1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
              <path d="M13 17 L5 12" /><path d="M27 23 L35 28" /><path d="M13 29 L6 33" />
            </g>
            <g className="bh-legs bh-l2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
              <path d="M27 17 L35 12" /><path d="M13 23 L5 28" /><path d="M27 29 L34 33" />
            </g>
            <path d="M16 9 L12 3 M24 9 L28 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <ellipse cx="20" cy="21" rx="8" ry="11.5" fill="currentColor" />
            <circle cx="20" cy="9.5" r="4.4" fill="currentColor" />
            <path d="M20 14 L20 32" stroke="var(--paper)" strokeWidth="1.1" opacity="0.55" />
            <circle cx="17.7" cy="8.6" r="1" fill="var(--paper)" /><circle cx="22.3" cy="8.6" r="1" fill="var(--paper)" />
          </svg>
        </div>
      )}
      {splat && (
        <svg className="bh-splat" aria-hidden="true" viewBox="0 0 60 60" width="56" height="56"
          style={{ transform: `translate3d(${splat.x - 11}px, ${splat.y - 11}px, 0)` }}>
          <path fill="currentColor" d="M30 10c5 0 7 6 11 7s11 0 12 6-6 8-7 12 3 11-3 13-9-5-13-5-8 6-13 3-1-9-3-13-10-6-8-12 8-5 11-8 3-9 8-9z" opacity="0.9" />
          <circle cx="8" cy="14" r="2.4" fill="currentColor" /><circle cx="52" cy="46" r="2" fill="currentColor" /><circle cx="50" cy="10" r="1.6" fill="currentColor" />
        </svg>
      )}
      {toast && (
        <div className={`bh-toast${toast.all ? " is-all" : ""}`} role="status" aria-live="polite">
          <span className="bh-head">{toast.head}</span>
          <span className="bh-sub">{toast.sub}</span>
        </div>
      )}
    </>
  );
}
