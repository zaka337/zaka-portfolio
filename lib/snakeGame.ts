/* Pure Snake rules (no React, no DOM) so they can be tested on their own.
   The board wraps around at the edges; hitting yourself ends the game. */

export const COLS = 15;
export const ROWS = 11;

export type Dir = "up" | "down" | "left" | "right";
export type Cell = [number, number]; // [col, row]

export interface SnakeState {
  snake: Cell[]; // head first
  dir: Dir;
  food: Cell;
  score: number;
  over: boolean;
}

const VEC: Record<Dir, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export const isOpposite = (a: Dir, b: Dir) => OPPOSITE[a] === b;

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/* A random empty cell, or null if the snake fills the whole board. */
export function placeFood(snake: Cell[], rand: () => number): Cell | null {
  const free: Cell[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!snake.some((s) => s[0] === c && s[1] === r)) free.push([c, r]);
    }
  }
  if (!free.length) return null;
  return free[Math.min(free.length - 1, Math.floor(rand() * free.length))];
}

export function initialState(rand: () => number): SnakeState {
  const row = Math.floor(ROWS / 2);
  const snake: Cell[] = [[6, row], [5, row], [4, row], [3, row]];
  return { snake, dir: "right", food: placeFood(snake, rand) ?? [0, 0], score: 0, over: false };
}

/* Advance one tick heading `want` (a reversal is ignored). */
export function step(state: SnakeState, want: Dir, rand: () => number): SnakeState {
  if (state.over) return state;
  const dir = isOpposite(state.dir, want) ? state.dir : want;
  const [dx, dy] = VEC[dir];
  const head = state.snake[0];
  const next: Cell = [(head[0] + dx + COLS) % COLS, (head[1] + dy + ROWS) % ROWS];
  const eats = same(next, state.food);

  // The tail cell is vacated this tick unless the snake is growing.
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (body.some((c) => same(c, next))) return { ...state, dir, over: true };

  const snake: Cell[] = [next, ...body];
  if (!eats) return { ...state, snake, dir };

  const food = placeFood(snake, rand);
  // Board completely full: that is a win, end the game.
  if (!food) return { snake, dir, food: next, score: state.score + 1, over: true };
  return { snake, dir, food, score: state.score + 1, over: false };
}

/* Milliseconds per tick: starts relaxed and speeds up every 5 points. */
export function tickMs(score: number): number {
  return Math.max(75, 170 - Math.floor(score / 5) * 14);
}
