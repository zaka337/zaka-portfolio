"use client";

import { useEffect, useRef, useState } from "react";
import { ROLES, roleName } from "@/lib/roles";
import { play, soundOn } from "@/lib/sound";
import "./roletype.css";

/* The role block on the home page, as kinetic type. It never sits still:

   - every few seconds the role changes, through five different effects in turn: a split-flap
     board, a gravity drop, an explosion that reassembles, a scramble that decodes, and a 3D drum;
   - on a computer, the letters near the cursor stretch and lift like elastic (a fisheye for type),
     the far ones dim, and the change comes faster while it is hovered;
   - a click or a tap blows the letters out from where you touched and rebuilds them as the next role;
   - the block is a real button, so the keyboard can do it too (Enter or Space).

   With Reduce Motion or calm mode nothing moves by itself: the role changes instantly when pressed.
   The animated letters are hidden from screen readers; the button says the role in words.
   Only transforms and opacity are animated, and the timer sits out while the tab is hidden, the title
   egg or the page crumble is running, or the button has keyboard focus (so it never changes under
   someone who is using it). */

type Fx = "flip" | "scatter" | "drop" | "decode" | "drum";
const FX: Fx[] = ["flip", "drop", "decode", "drum", "scatter"];
// How long each effect takes, in ms (the CSS in roletype.css is timed to fit inside these)
const LASTS: Record<Fx, number> = { flip: 1300, scatter: 1450, drop: 1550, decode: 1350, drum: 1250 };
const IDLE = 3800;
const IDLE_HOVER = 2400;
const REACH = 130;           // how far (px) the cursor's pull reaches
const DECODE_TICKS = 20;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const KEEP = /[-&.]/;        // characters the decode effect does not scramble

interface Run {
  from: number;
  to: number;
  fx: Fx;
  burst: boolean;
  k: number;                              // how far the pieces fly (px)
  rv: [number, number, number, number][]; // per letter: x, y, spin, size (random, fixed for the run)
}

const calmNow = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RoleType() {
  const [cur, setCur] = useState(0);
  const [run, setRun] = useState<Run | null>(null);
  const [tick, setTick] = useState(0);        // the decode effect's clock
  const btn = useRef<HTMLButtonElement>(null);
  const press = useRef<(at: { x: number; y: number } | null) => void>(() => {});

  /* All of the timing and the cursor physics live here, outside React's render. */
  useEffect(() => {
    const root = btn.current;
    if (!root) return;
    let current = 0;
    let running: Run | null = null;
    let runAt = 0;
    let queued: { x: number; y: number } | null | false = false;
    let seq = 0;
    let hovered = false;
    let focused = false;
    let ptr: { x: number; y: number } | null = null;
    let idleT = 0, doneT = 0, decodeT = 0, raf = 0, settleT = 0;
    const soundT: number[] = [];
    let centres: { el: HTMLElement; x: number; y: number }[] = [];
    let spring: number[][] = [];

    /* Where each letter of the steady word sits on screen, for the cursor effect */
    const measure = () => {
      centres = Array.from(root.querySelectorAll<HTMLElement>(".rt-in .rt-ch")).map((c) => {
        const r = c.getBoundingClientRect();
        return { el: c.querySelector<HTMLElement>(".rt-mag")!, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      spring = centres.map((_, i) => spring[i] ?? [0, 1, 1, 0, 0, 0]);
    };

    /* Each letter springs towards a pose that depends on how close the cursor is:
       [lift, stretch, squeeze, spin, push, focus] */
    const frame = () => {
      raf = 0;
      let moving = false;
      const p = running ? null : ptr; // the letters rest while the role is changing
      centres.forEach((c, i) => {
        let target = [0, 1, 1, 0, 0, 0];
        if (p) {
          const dx = c.x - p.x, dy = c.y - p.y;
          const d = Math.hypot(dx, dy);
          const raw = Math.max(0, 1 - d / REACH);
          const f = raw * raw * (3 - 2 * raw);
          target = [-0.14 * f, 1 + 0.7 * f, 1 - 0.18 * f, (-dx / REACH) * 10 * f, (dx / (d || 1)) * 0.1 * f, f];
        }
        const s = spring[i] ?? (spring[i] = [0, 1, 1, 0, 0, 0]);
        for (let k = 0; k < 6; k++) {
          const diff = target[k] - s[k];
          s[k] += diff * 0.2;
          if (Math.abs(diff) > 0.003) moving = true;
        }
        c.el.style.transform = `translate(${s[4].toFixed(3)}em, ${s[0].toFixed(3)}em) scale(${s[2].toFixed(3)}, ${s[1].toFixed(3)}) rotate(${s[3].toFixed(2)}deg)`;
        c.el.style.setProperty("--f", s[5].toFixed(3));
      });
      if (p || moving) raf = requestAnimationFrame(frame);
      else centres.forEach((c) => { c.el.style.transform = ""; c.el.style.removeProperty("--f"); });
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const busy = () =>
      document.hidden || focused ||
      !!document.querySelector("[data-egg], .tr-card, .rc-backdrop") ||
      document.documentElement.hasAttribute("data-crumble");

    const schedule = () => {
      window.clearTimeout(idleT);
      if (calmNow()) return;
      idleT = window.setTimeout(() => {
        if (busy()) { schedule(); return; }
        go((current + 1) % ROLES.length, false, null);
      }, hovered ? IDLE_HOVER : IDLE);
    };

    /* Change the role. `burst` is a click or tap: the pieces fly away from `at`. */
    const go = (to: number, burst: boolean, at: { x: number; y: number } | null) => {
      window.clearTimeout(idleT);
      if (calmNow()) { current = to; running = null; setRun(null); setCur(to); window.setTimeout(measure, 30); return; }
      const from = current;
      const fx: Fx = burst ? "scatter" : FX[seq++ % FX.length];
      const out = centres; // positions of the letters about to leave, in reading order
      const count = ROLES[from].l1.length + ROLES[from].l2.length + ROLES[to].l1.length + ROLES[to].l2.length;
      const rv = Array.from({ length: count + 2 }, (_, i): [number, number, number, number] => {
        const r = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()] as [number, number, number, number];
        // A press sends each old letter straight away from the touch point
        if (burst && at && out[i]) {
          const dx = out[i].x - at.x, dy = out[i].y - at.y, d = Math.hypot(dx, dy) || 1;
          const mag = 0.65 + Math.random() * 0.5;
          r[0] = (dx / d) * mag; r[1] = (dy / d) * mag;
        }
        return r;
      });
      const r: Run = { from, to, fx, burst, k: burst ? 320 : 150, rv };
      running = r;
      runAt = performance.now();
      setRun(r);
      setTick(0);

      window.clearInterval(decodeT);
      if (fx === "decode") {
        let n = 0;
        decodeT = window.setInterval(() => { n++; setTick(n); if (n >= DECODE_TICKS) window.clearInterval(decodeT); }, 60);
      }
      soundT.splice(0).forEach((t) => window.clearTimeout(t));
      if (soundOn()) {
        const at2 = (ms: number, name: Parameters<typeof play>[0]) => soundT.push(window.setTimeout(() => play(name), ms));
        if (burst) at2(0, "whoosh");
        else if (fx === "flip") for (let i = 0; i < 9; i++) at2(300 + i * 70, "key");
        else if (fx === "decode") for (let i = 0; i < 6; i++) at2(300 + i * 150, "tick");
        else if (fx === "drum") at2(120, "page");
        else if (fx === "drop") at2(900, "squash");
      }
      if (burst) navigator.vibrate?.(12);

      window.clearTimeout(doneT);
      doneT = window.setTimeout(() => {
        current = to;
        running = null;
        setRun(null);
        setCur(to);
        window.clearInterval(decodeT);
        window.clearTimeout(settleT);
        settleT = window.setTimeout(() => { measure(); if (hovered) wake(); }, 60);
        if (queued !== false) {
          const q = queued;
          queued = false;
          go((to + 1) % ROLES.length, true, q);
        } else schedule();
      }, LASTS[fx] + (burst ? 150 : 0));
    };

    /* A press during a change waits for it to finish, then fires its own */
    press.current = (at) => {
      if (running) { queued = at; return; }
      go((current + 1) % ROLES.length, true, at);
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hovered = true;
      root.classList.add("is-hover");
      measure();
      schedule();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || calmNow()) return;
      ptr = { x: e.clientX, y: e.clientY };
      wake();
    };
    const onLeave = () => {
      hovered = false;
      ptr = null;
      root.classList.remove("is-hover");
      wake();
      schedule();
    };
    // Only keyboard focus pauses the timer: a mouse click also focuses a button, and that must not stop it
    const onFocus = () => { focused = root.matches(":focus-visible"); };
    const onBlur = () => { focused = false; schedule(); };
    const onVis = () => { if (!document.hidden) schedule(); };

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("focus", onFocus);
    root.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", measure);
    measure();
    schedule();
    // Letters are placed by the entrance animation first, so measure again once it is done
    const first = window.setTimeout(measure, 1000);

    return () => {
      window.clearTimeout(idleT);
      window.clearTimeout(doneT);
      window.clearTimeout(settleT);
      window.clearTimeout(first);
      window.clearInterval(decodeT);
      soundT.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focus", onFocus);
      root.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", measure);
      press.current = () => {};
    };
  }, []);

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // A key press arrives as a click with no position: use the middle of the block
    if (e.detail === 0 && btn.current) {
      const r = btn.current.getBoundingClientRect();
      press.current({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    } else press.current({ x: e.clientX, y: e.clientY });
  };

  /* ── Drawing ── */
  const role = ROLES[cur];
  const into = run ? ROLES[run.to] : role;
  const out = run ? ROLES[run.from] : null;

  const word = (r: typeof role, layer: "in" | "out") => {
    let idx = 0;
    return [r.l1, r.l2].map((text, li) => ({
      li,
      row: text.split("").map((ch, i) => {
        const n = idx++;
        const rv = run?.rv[n % run.rv.length] ?? [0, 0, 0, 0];
        // decode: a letter shows noise until its turn comes (left to right, line by line), then locks
        let noise = "";
        let locked = false;
        if (layer === "in" && run?.fx === "decode" && ch !== " " && !KEEP.test(ch)) {
          const lock = 5 + Math.round((n / 19) * (DECODE_TICKS - 6));
          if (tick < lock) noise = GLYPHS[(n * 7 + tick * 13 + n * tick) % GLYPHS.length];
          else locked = true;
        }
        return (
          <span
            key={`${layer}${li}-${i}-${ch}`}
            className={`rt-ch${noise ? " rt-scr" : ""}${locked ? " rt-locked" : ""}`}
            data-s={noise || undefined}
            style={{
              ["--i" as string]: n,
              ["--rx" as string]: rv[0].toFixed(3),
              ["--ry" as string]: rv[1].toFixed(3),
              ["--rr" as string]: (rv[2] * 220).toFixed(0),
              ["--rs" as string]: rv[3].toFixed(3),
            } as React.CSSProperties}
          >
            <span className="rt-mag">{ch === " " ? " " : ch}</span>
          </span>
        );
      }),
    }));
  };
  const inWord = word(into, "in");
  const outWord = out ? word(out, "out") : null;

  return (
    <div className="block-mr nav-text rt-block">
      <div className="home-enter home-enter-1">
        <button
          ref={btn}
          type="button"
          className={`rt${run ? " is-running" : ""}`}
          data-fx={run?.fx ?? "idle"}
          data-burst={run?.burst ? "1" : "0"}
          aria-label={`${roleName(role)}. Press for another of my roles.`}
          style={run ? ({ ["--k" as string]: run.k } as React.CSSProperties) : undefined}
          onClick={onClick}
        >
          {inWord.map(({ li, row }) => (
            <span key={li} className="nav-item rt-line" style={{ ["--line" as string]: li } as React.CSSProperties} aria-hidden="true">
              {outWord && <span className="rt-out">{outWord[li].row}</span>}
              <span className="rt-in">{row}</span>
            </span>
          ))}
        </button>
      </div>
      <p className="nav-hint">PRESS FOR ANOTHER</p>
    </div>
  );
}
