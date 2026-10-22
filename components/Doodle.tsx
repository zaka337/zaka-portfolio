"use client";

import { useEffect, useRef, useState } from "react";
import "./doodle.css";

/* Hold D and move the mouse: the full stop draws on the page in ink, and the ink fades away a
   couple of seconds after you let go. Nothing is saved and nothing stays; it is only there to
   play with. Computers with a mouse only. It does nothing while you are typing in a field, and
   the drawing never catches a click (the canvas ignores the pointer). The canvas is only
   redrawn while there is ink on it; with no strokes the page does no work for it.

   The line is thicker when the pointer is slow and thinner when it is fast, like a brush, and
   it takes the site's ink colour, so it works on the dark theme too. With Reduce Motion or calm
   mode the ink goes away quickly instead of slowly. Tell the cursor (components/CustomCursor.tsx)
   with `zk-doodle` so the dot swells while drawing. */

interface Pt { x: number; y: number; w: number }
interface Stroke { pts: Pt[]; ended: number; color: string }

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export default function Doodle() {
  const [hint, setHint] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const canvas = cv.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FADE = still ? 600 : 2600;
    const strokes: Stroke[] = [];
    let cur: Stroke | null = null;
    let drawing = false;
    let raf = 0;
    let dpr = 1;
    let hintT = 0;
    const at = { x: -1, y: -1, t: 0, v: 0, known: false };

    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    size();

    const draw = (now: number) => {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        const age = s.ended ? (now - s.ended) / FADE : 0;
        if (age >= 1) { strokes.splice(i, 1); continue; }
        ctx.globalAlpha = Math.pow(1 - age, 1.6);
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        const p = s.pts;
        if (p.length === 1) {
          ctx.beginPath(); ctx.arc(p[0].x, p[0].y, p[0].w / 2, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        // Smooth line: curves through the midpoints, each piece with its own thickness
        for (let k = 1; k < p.length; k++) {
          const a = p[k - 1], b = p[k];
          const m0x = k === 1 ? a.x : (p[k - 2].x + a.x) / 2, m0y = k === 1 ? a.y : (p[k - 2].y + a.y) / 2;
          const m1x = (a.x + b.x) / 2, m1y = (a.y + b.y) / 2;
          ctx.lineWidth = (a.w + b.w) / 2;
          ctx.beginPath();
          ctx.moveTo(m0x, m0y);
          ctx.quadraticCurveTo(a.x, a.y, m1x, m1y);
          if (k === p.length - 1) ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (strokes.length || drawing) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(draw); };

    const begin = () => {
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#111";
      cur = { pts: at.known ? [{ x: at.x, y: at.y, w: 4 }] : [], ended: 0, color: ink };
      strokes.push(cur);
      drawing = true;
      window.dispatchEvent(new CustomEvent("zk-doodle", { detail: true }));
      wake();
    };
    const end = () => {
      if (!drawing) return;
      drawing = false;
      if (cur) cur.ended = performance.now();
      cur = null;
      window.dispatchEvent(new CustomEvent("zk-doodle", { detail: false }));
      wake();
    };

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (at.known && now > at.t) {
        const d = Math.hypot(e.clientX - at.x, e.clientY - at.y) / (now - at.t); // px per ms
        at.v += (d - at.v) * 0.35;
      }
      at.x = e.clientX; at.y = e.clientY; at.t = now; at.known = true;
      if (!drawing || !cur) return;
      const w = Math.max(1.7, Math.min(6.2, 6.4 - at.v * 2.2));
      const last = cur.pts[cur.pts.length - 1];
      if (last && Math.hypot(last.x - at.x, last.y - at.y) < 1.5) return;
      cur.pts.push({ x: at.x, y: at.y, w: last ? last.w + (w - last.w) * 0.5 : w });
      wake();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.documentElement.hasAttribute("data-mayhem")) return; // D is "steer right" in the racing game
      if (e.key.toLowerCase() === "d" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target)) begin();
      else if (e.key === "Escape" && strokes.length) { strokes.length = 0; end(); wake(); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "d") end(); };
    const onBlur = () => end();
    const onHint = () => {
      setHint(true);
      window.clearTimeout(hintT);
      hintT = window.setTimeout(() => setHint(false), 4500);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", size);
    window.addEventListener("zk-doodle-hint", onHint);
    return () => {
      end();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", size);
      window.removeEventListener("zk-doodle-hint", onHint);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(hintT);
    };
  }, []);

  return (
    <>
      <canvas ref={cv} className="dd-canvas" aria-hidden="true" />
      <p className={`dd-hint${hint ? " is-on" : ""}`} aria-hidden="true">HOLD <kbd>D</kbd> AND MOVE THE MOUSE</p>
    </>
  );
}
