import { Track } from "./track";
import type { Car } from "./vehicle";
import { CP_COUNT } from "./world";

/* Lap, checkpoint and position bookkeeping. Progress is the distance driven along the road
   from the start line (it starts negative, because the grid is behind the line). A checkpoint
   counts when the car's progress passes it, in order, and a lap counts when it crosses the
   line having passed every checkpoint. There is no way to cut a corner: the barriers keep
   every car on the road, so progress along it is the truth. */

export const LAPS = 3;

export interface RaceEvents {
  checkpoint?: (c: Car, k: number) => void;
  lap?: (c: Car, lapTime: number, lapNo: number, best: boolean) => void;
  finish?: (c: Car) => void;
}

export function initProgress(c: Car, track: Track) {
  const s = track.sOf(c.proj.i, c.proj.t);
  c.total = s > track.length / 2 ? s - track.length : s;
  c.prevS = s;
  c.lap = 0; c.cp = 0; c.finished = false; c.finishTime = 0; c.lapStart = 0; c.bestLap = Infinity; c.lapTimes = []; c.started = false;
}

export function updateProgress(c: Car, track: Track, raceTime: number, ev: RaceEvents) {
  const L = track.length;
  const s = track.sOf(c.proj.i, c.proj.t);
  let d = s - c.prevS;
  if (d < -L / 2) d += L; else if (d > L / 2) d -= L;
  c.prevS = s;
  c.total += d;
  if (!c.started && c.total >= 0) { c.started = true; c.lapStart = raceTime; }
  if (c.finished) return;
  const p = c.total - c.lap * L;      // distance into the lap in progress
  while (c.cp < CP_COUNT && p >= ((c.cp + 1) / (CP_COUNT + 1)) * L) {
    ev.checkpoint?.(c, c.cp);
    c.cp++;
  }
  if (c.cp === CP_COUNT && c.total >= (c.lap + 1) * L) {
    const t = raceTime - c.lapStart;
    c.lapStart = raceTime;
    c.lapTimes.push(t);
    c.lap++;
    c.cp = 0;
    const best = t < c.bestLap;
    if (best) c.bestLap = t;
    ev.lap?.(c, t, c.lap, best);
    if (c.lap >= LAPS) { c.finished = true; c.finishTime = raceTime; ev.finish?.(c); }
  }
}

/** Finished cars first by finishing time, then everyone else by how far they have driven */
export function rank(cars: Car[]) {
  const order = [...cars].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.total - a.total;
  });
  order.forEach((c, i) => { c.place = i + 1; });
  return order;
}
