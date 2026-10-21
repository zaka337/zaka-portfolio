"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COLS, ROWS, initialState, isOpposite, step, tickMs, type Dir, type SnakeState } from "@/lib/snakeGame";
import { swipeDir, type Skin } from "@/lib/phoneOS";

/* Snake for the modern phones: the same rules as the Nokia's (lib/snakeGame.ts), drawn in each
   phone's own style (rounded blocks, round beads, or dot-matrix dots). Steer with a swipe, the
   arrow keys or WASD, or the buttons under the board; tap the board to start or pause. */

type Status = "ready" | "playing" | "paused" | "over";
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;

const KEYS: Record<string, Dir> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right",
};

export default function PhoneSnake({ skin }: { skin: Skin }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<SnakeState>(initialState(Math.random));
  const queue = useRef<Dir[]>([]);
  const statusRef = useRef<Status>("ready");
  const blink = useRef(true);
  const press = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const setSt = useCallback((s: Status) => { statusRef.current = s; setStatus(s); }, []);

  const colours = useRef({ fg: "#fff", dim: "rgba(255,255,255,.2)", red: "#ff3b2f" });
  useEffect(() => {
    const cs = getComputedStyle(canvas.current!);
    colours.current = {
      fg: cs.getPropertyValue("--ph-fg").trim() || "#fff",
      dim: cs.getPropertyValue("--ph-grid").trim() || "rgba(255,255,255,.18)",
      red: cs.getPropertyValue("--ph-red").trim() || cs.getPropertyValue("--ph-fg").trim() || "#fff",
    };
  }, []);

  const draw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const s = state.current;
    const { fg, dim, red } = colours.current;
    ctx.clearRect(0, 0, W, H);

    // the board: a faint dot on every cell
    ctx.fillStyle = dim;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { ctx.beginPath(); ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 1.6, 0, 7); ctx.fill(); }

    const box = (c: number, r: number, inset: number, rad: number) => {
      const x = c * CELL + inset, y = r * CELL + inset, w = CELL - inset * 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, w, rad); else ctx.rect(x, y, w, w);
      ctx.fill();
    };
    const dot = (c: number, r: number, rad: number) => { ctx.beginPath(); ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, rad, 0, 7); ctx.fill(); };

    ctx.fillStyle = fg;
    s.snake.forEach(([c, r], i) => {
      if (skin === "iphone") box(c, r, 2, i === 0 ? 8 : 6);
      else if (skin === "pixel") dot(c, r, i === 0 ? 10.5 : 9);
      else dot(c, r, i === 0 ? 8 : 6);
    });

    if (blink.current && !s.over) {
      const [fc, fr] = s.food;
      ctx.fillStyle = skin === "nothing" ? red : fg;
      if (skin === "iphone") { ctx.beginPath(); ctx.arc(fc * CELL + CELL / 2, fr * CELL + CELL / 2, 8, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = fg; ctx.stroke(); }
      else if (skin === "pixel") box(fc, fr, 6, 4);
      else dot(fc, fr, 7);
    }
  }, [skin]);

  const start = useCallback((d?: Dir) => {
    state.current = initialState(Math.random);
    queue.current = d && !isOpposite(state.current.dir, d) && d !== state.current.dir ? [d] : [];
    setScore(0);
    setSt("playing");
    draw();
  }, [draw, setSt]);

  const turn = useCallback((d: Dir) => {
    const s = statusRef.current;
    if (s === "ready" || s === "over") { start(d); return; }
    if (s === "paused") setSt("playing");
    const last = queue.current[queue.current.length - 1] ?? state.current.dir;
    if (d !== last && !isOpposite(last, d) && queue.current.length < 2) queue.current.push(d);
  }, [start, setSt]);

  const action = useCallback(() => {
    const s = statusRef.current;
    if (s === "ready" || s === "over") start();
    else if (s === "playing") setSt("paused");
    else setSt("playing");
  }, [start, setSt]);

  // The game loop: the delay is read again every tick, so the snake speeds up as the score grows
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (statusRef.current === "playing") {
        const want = queue.current.shift() ?? state.current.dir;
        const next = step(state.current, want, Math.random);
        state.current = next;
        setScore(next.score);
        if (next.over) { setBest((b) => Math.max(b, next.score)); setSt("over"); }
        draw();
      }
      id = setTimeout(loop, tickMs(state.current.score) + 20);
    };
    id = setTimeout(loop, 170);
    const bl = setInterval(() => { blink.current = !blink.current; draw(); }, 280);
    const hide = () => { if (document.hidden && statusRef.current === "playing") setSt("paused"); };
    document.addEventListener("visibilitychange", hide);
    draw();
    return () => { clearTimeout(id); clearInterval(bl); document.removeEventListener("visibilitychange", hide); };
  }, [draw, setSt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) return;
      const d = KEYS[e.key];
      if (d) { e.preventDefault(); turn(d); }
      else if (e.key === " " || e.key === "Enter") {
        if ((e.target as HTMLElement | null)?.closest?.("button, a")) return; // a focused button keeps its own Enter
        e.preventDefault(); action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn, action]);

  // Swipes: a flick steers at once, a plain tap starts or pauses
  const onDown = (e: React.PointerEvent) => { press.current = { x: e.clientX, y: e.clientY }; moved.current = false; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the board still gets the moves */ } };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const d = swipeDir(e.clientX - p.x, e.clientY - p.y, 22);
    if (d) { turn(d); press.current = { x: e.clientX, y: e.clientY }; moved.current = true; }
  };
  const onUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (p && !moved.current && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 10) action();
  };

  return (
    <div className="ph-snake" data-status={status} data-score={score}>
      <div className="ph-snake-bar">
        <span>Score <b>{score}</b></span>
        <span>Best <b>{best}</b></span>
      </div>
      <div className="ph-snake-board" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { press.current = null; }}>
        <canvas ref={canvas} width={W} height={H} aria-label="Snake board" />
        {status !== "playing" && (
          <div className="ph-snake-msg">
            {status === "ready" && (<><b>Snake</b><span>Swipe or tap to start</span></>)}
            {status === "paused" && (<><b>Paused</b><span>Tap to carry on</span></>)}
            {status === "over" && (<><b>Game over</b><span>Score {score} {'·'} Best {best}</span><span>Tap to play again</span></>)}
          </div>
        )}
      </div>
      <div className="ph-dpad" role="group" aria-label="Steer">
        <button type="button" className="u" aria-label="Up" onClick={() => turn("up")}>{'▲'}</button>
        <button type="button" className="l" aria-label="Left" onClick={() => turn("left")}>{'◀'}</button>
        <button type="button" className="m" aria-label={status === "playing" ? "Pause" : "Start"} onClick={action}>{status === "playing" ? "II" : "GO"}</button>
        <button type="button" className="r" aria-label="Right" onClick={() => turn("right")}>{'▶'}</button>
        <button type="button" className="d" aria-label="Down" onClick={() => turn("down")}>{'▼'}</button>
      </div>
    </div>
  );
}
