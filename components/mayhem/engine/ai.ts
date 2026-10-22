import { Track } from "./track";
import type { Car } from "./vehicle";
import { clamp, wrapAngle, rng } from "./util";

/* The computer drivers. Each one looks a little way down the road and steers at that point
   (further ahead the faster it goes), slows for the sharpest bend it can see coming, shifts
   sideways to get round a car in front, and has a few small habits of its own. If it ends up
   stuck or facing the wrong way it backs up and turns round. They use the same driving model
   as the player and the same checkpoints and laps. */

export function makeAi(seed: number) {
  const r = rng(seed);
  return {
    skill: 0.925 + r() * 0.055,
    corner: 0.92 + r() * 0.16,
    line: (r() - 0.5) * 3.0,
    avoid: 0,
    stuck: 0,
    reverse: 0,
    wobble: r() * 6,
  };
}

const at = { x: 0, z: 0, y: 0, h: 0 };

/** Fill in `c.input`. `ahead` is how far in front of the leader-of-the-humans this car is (to keep the race close). */
export function driveAi(c: Car, cars: Car[], track: Track, dt: number, time: number, humanTotal: number, racing: boolean) {
  const ai = c.ai!;
  const inp = c.input;
  if (!racing) { inp.throttle = 0; inp.brake = 0.2; inp.steer = 0; inp.handbrake = false; return; }
  const n = track.n, i0 = c.proj.i;
  const sp = Math.max(0, c.speed);
  const sinH = Math.sin(c.h), cosH = Math.cos(c.h);

  // other cars
  let avoidTarget = 0, tooClose = false;
  for (const o of cars) {
    if (o === c) continue;
    const dx = o.x - c.x, dz = o.z - c.z;
    const f = dx * sinH + dz * cosH, l = -dx * cosH + dz * sinH;
    if (f > 1 && f < 17 && Math.abs(l) < 3.4) {
      avoidTarget = l > 0 ? -4.4 : 4.4;
      if (f < 6 && Math.abs(l) < 2.2 && o.speed < c.speed + 2) tooClose = true;
    }
  }
  ai.avoid += (avoidTarget - ai.avoid) * Math.min(1, dt * 2.6);

  // where to steer
  const look = Math.round(clamp(9 + sp * 0.55, 9, 30));
  const wob = Math.sin(time * 0.45 + ai.wobble) * 1.1;
  const lat = clamp(ai.line + wob + ai.avoid, -5.6, 5.6);
  const tp = track.at(i0 + look, lat, at);
  const desired = Math.atan2(tp.x - c.x, tp.z - c.z);
  const err = wrapAngle(desired - c.h);

  // how fast the next bends allow
  let curvMax = 0;
  const bl = Math.round(clamp(14 + sp * 1.3, 14, 54));
  for (let k = 0; k <= bl; k += 3) curvMax = Math.max(curvMax, Math.abs(track.curv[(i0 + k) % n]));
  const vCorner = curvMax > 1e-4 ? Math.sqrt((36 * ai.corner) / curvMax) : 1e9;
  let vTarget = Math.min(c.spec.phys.maxSpeed * ai.skill, vCorner);
  // keep it close: a little quicker when far behind the humans, a little slower when far ahead
  const rb = clamp((humanTotal - c.total) / 140, -1, 1);
  vTarget *= 1 + (rb > 0 ? rb * 0.045 : rb * 0.06);
  if (c.finished) vTarget = Math.min(vTarget * 0.4, 14);

  let steer = clamp(-err * 2.4, -1, 1);
  let throttle = clamp((vTarget - sp) / 3.2, 0, 1);
  let brake = sp > vTarget * 1.05 ? clamp((sp - vTarget) / 5, 0, 1) : 0;
  if (tooClose) { throttle *= 0.35; brake = Math.max(brake, 0.15); }

  // stuck or facing the wrong way: back up and turn round
  const headingErr = wrapAngle(track.heading(i0) - c.h);
  if (sp < 1.2 && vTarget > 6) ai.stuck += dt; else if (sp > 3) ai.stuck = 0;
  if (ai.stuck > 1.2 || (Math.abs(headingErr) > 1.9 && sp < 8)) { ai.reverse = 1.0; ai.stuck = 0; }
  if (ai.reverse > 0) {
    ai.reverse -= dt;
    throttle = 0; brake = 1;
    steer = clamp(err * 2.4, -1, 1);
  }
  inp.throttle = throttle; inp.brake = brake; inp.steer = steer; inp.handbrake = false;
}
