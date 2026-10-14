"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { COLS, ROWS, initialState, isOpposite, step, tickMs, type Dir, type SnakeState } from "@/lib/snakeGame";

export interface SnakeHandle {
  turn: (d: Dir) => void;
  action: () => void; // OK key: start, pause, resume or play again
}

type Status = "ready" | "playing" | "paused" | "over";

const CELL = 16;
const SCORE_H = 48;
const W = COLS * CELL;
const H = SCORE_H + ROWS * CELL;
const INK = "#1c2a12";

/* 3x5 bitmap digits, so the score looks like a real handset LCD. */
const DIGITS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
};

const NokiaSnake = forwardRef<SnakeHandle>(function NokiaSnake(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<SnakeState>(initialState(Math.random));
  const queue = useRef<Dir[]>([]);
  const statusRef = useRef<Status>("ready");
  const blink = useRef(true);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const setSt = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const s = state.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;

    // Score, top left, in 3x5 pixel digits
    const px = 6;
    [...String(s.score)].forEach((ch, i) => {
      DIGITS[ch].forEach((row, y) => {
        [...row].forEach((on, x) => {
          if (on === "1") ctx.fillRect(4 + i * 4 * px + x * px, 6 + y * px, px - 1, px - 1);
        });
      });
    });

    // Play-area frame
    ctx.fillRect(0, SCORE_H - 3, W, 3);

    // Snake
    s.snake.forEach(([c, r]) => ctx.fillRect(c * CELL + 1, SCORE_H + r * CELL + 1, CELL - 2, CELL - 2));

    // Food blinks
    if (blink.current && !s.over) {
      const [fc, fr] = s.food;
      const cx = fc * CELL + CELL / 2;
      const cy = SCORE_H + fr * CELL + CELL / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
    }
  }, []);

  const start = useCallback((d?: Dir) => {
    state.current = initialState(Math.random);
    queue.current = d && !isOpposite(state.current.dir, d) && d !== state.current.dir ? [d] : [];
    setScore(0);
    setSt("playing");
    draw();
  }, [draw, setSt]);

  useImperativeHandle(ref, () => ({
    turn(d) {
      const s = statusRef.current;
      if (s === "ready" || s === "over") { start(d); return; }
      if (s === "paused") setSt("playing");
      const last = queue.current[queue.current.length - 1] ?? state.current.dir;
      if (d !== last && !isOpposite(last, d) && queue.current.length < 2) queue.current.push(d);
    },
    action() {
      const s = statusRef.current;
      if (s === "ready" || s === "over") start();
      else if (s === "playing") setSt("paused");
      else setSt("playing");
    },
  }), [start, setSt]);

  // Game loop: the delay is re-read every tick so the snake speeds up as the score grows.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (statusRef.current === "playing") {
        const want = queue.current.shift() ?? state.current.dir;
        const next = step(state.current, want, Math.random);
        state.current = next;
        setScore(next.score);
        if (next.over) {
          setBest((b) => Math.max(b, next.score));
          setSt("over");
        }
        draw();
      }
      id = setTimeout(loop, tickMs(state.current.score));
    };
    id = setTimeout(loop, 170);
    const bl = setInterval(() => { blink.current = !blink.current; draw(); }, 260);
    draw();
    return () => { clearTimeout(id); clearInterval(bl); };
  }, [draw, setSt]);

  return (
    <div className="nk-snake" data-status={status} data-score={score} data-length={state.current.snake.length}>
      <canvas ref={canvasRef} className="nk-snake-canvas" width={W} height={H} />
      {status !== "playing" && (
        <div className="nk-snake-msg">
          {status === "ready" && (<><div>SNAKE</div><div>OK:START</div><div>2468:MOVE</div></>)}
          {status === "paused" && (<><div>PAUSED</div><div>OK:RESUME</div></>)}
          {status === "over" && (<><div>GAME OVER</div><div>SCORE {score}</div><div>BEST {best}</div><div>OK:AGAIN</div></>)}
        </div>
      )}
    </div>
  );
});

export default NokiaSnake;
