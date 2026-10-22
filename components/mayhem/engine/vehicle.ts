import { Track, makeProj, type Proj } from "./track";
import type { Rig, RacerSpec } from "./cars";
import { clamp, damp, wrapAngle } from "./util";

/* The driving model. It is a deliberately simple arcade one: the car has a heading and a
   velocity, steering turns the heading (less when slow, a little less when very fast), and
   grip pulls the velocity back in line with the heading. Lower the grip (the handbrake, or a
   drifter's tyres) and the car slides sideways until the grip wins again, which is a drift.

   The same step runs for the player and the computer drivers; only `input` differs. */

export interface Input { throttle: number; brake: number; steer: number; handbrake: boolean }

export interface Car {
  id: number;
  spec: RacerSpec;
  human: boolean;
  rig: Rig;
  // state, and the previous step's state for smooth drawing between steps
  x: number; z: number; y: number; h: number;
  px: number; pz: number; py: number; ph: number;
  vx: number; vz: number;
  yaw: number;        // turn rate (radians per second, positive turns left)
  steer: number;      // smoothed steering, positive is right
  speed: number;      // forward speed, negative when reversing
  lat: number;        // sideways speed
  accel: number;
  latAccel: number;
  slide: number;      // 0..1, how sideways the car is
  slope: number;
  spin: number;       // distance rolled this step, for the wheels
  impact: number;     // 0..1 and decays
  hit: number;        // the strength of the latest hit, read once by the audio
  input: Input;
  proj: Proj;
  // race bookkeeping
  total: number; prevS: number; lap: number; cp: number; finished: boolean; finishTime: number;
  lapStart: number; bestLap: number; lapTimes: number[]; place: number; started: boolean;
  // computer driver memory
  ai: { skill: number; corner: number; line: number; avoid: number; stuck: number; reverse: number; wobble: number } | null;
}

export const emptyInput = (): Input => ({ throttle: 0, brake: 0, steer: 0, handbrake: false });

const BRAKE = 40;
const REVERSE_MAX = 11;
const ROLL = 3.0;
const DRAG = 0.0011;
export const CAR_R = 1.15;       // collision circle radius
export const CAR_OFF = 1.25;     // the two circles sit this far in front of and behind the centre
const WALL_FACE = 0.6;           // the barrier face is this far outside the road edge

export function makeCar(id: number, spec: RacerSpec, human: boolean, rig: Rig): Car {
  return {
    id, spec, human, rig, x: 0, z: 0, y: 0, h: 0, px: 0, pz: 0, py: 0, ph: 0, vx: 0, vz: 0, yaw: 0, steer: 0, speed: 0, lat: 0,
    accel: 0, latAccel: 0, slide: 0, slope: 0, spin: 0, impact: 0, hit: 0, input: emptyInput(), proj: makeProj(),
    total: 0, prevS: 0, lap: 0, cp: 0, finished: false, finishTime: 0, lapStart: 0, bestLap: Infinity, lapTimes: [], place: id + 1, started: false,
    ai: null,
  };
}

export function placeCar(c: Car, x: number, z: number, y: number, h: number, track: Track) {
  c.x = c.px = x; c.z = c.pz = z; c.y = c.py = y; c.h = c.ph = h;
  c.vx = c.vz = 0; c.yaw = 0; c.steer = 0; c.speed = 0; c.lat = 0; c.accel = 0; c.latAccel = 0; c.slide = 0; c.impact = 0; c.hit = 0; c.slope = 0;
  c.input = emptyInput();
  track.projectGlobal(x, z, c.proj);
}

const tmp = makeProj();

export function stepCar(c: Car, dt: number, track: Track) {
  c.px = c.x; c.pz = c.z; c.py = c.y; c.ph = c.h;
  const s = c.spec.phys, inp = c.input;
  const top = s.maxSpeed;

  const rate = inp.steer === 0 ? 7.5 : 5.2;
  c.steer += clamp(inp.steer - c.steer, -rate * dt, rate * dt);

  let sinH = Math.sin(c.h), cosH = Math.cos(c.h);
  let vf = c.vx * sinH + c.vz * cosH;
  let vl = -c.vx * cosH + c.vz * sinH;
  const sp = Math.abs(vf);
  const prevVf = vf;

  // engine, brakes, resistance
  if (inp.throttle > 0) vf += s.accel * inp.throttle * (1 - Math.pow(clamp(vf / top, 0, 1), 1.6)) * dt * (vf < 0 ? 2.4 : 1);
  if (inp.brake > 0) {
    if (vf > 0.6) vf -= BRAKE * inp.brake * dt;
    else vf -= s.accel * 0.75 * inp.brake * (1 - clamp(-vf / REVERSE_MAX, 0, 1)) * dt;
  }
  if (inp.throttle === 0 && inp.brake === 0) vf -= Math.sign(vf) * Math.min(Math.abs(vf), ROLL * dt);
  vf -= vf * Math.abs(vf) * DRAG * dt;
  const hb = inp.handbrake;
  if (hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 8 * dt);

  // steering: nothing when stopped, full by about 5 u/s, a little less at top speed
  const dir = vf >= 0 ? 1 : -1;
  const sf = clamp(Math.abs(vf) / 4.5, 0, 1) * (1 - 0.4 * clamp(Math.abs(vf) / top, 0, 1));
  let yawT = -c.steer * s.steer * sf * dir;
  if (hb) yawT *= 1.5;
  c.yaw = damp(c.yaw, yawT, hb ? 6 : 11, dt);

  // keep the world velocity, turn the heading, then let the grip pull the two back together
  c.vx = sinH * vf - cosH * vl;
  c.vz = cosH * vf + sinH * vl;
  c.h += c.yaw * dt;
  sinH = Math.sin(c.h); cosH = Math.cos(c.h);
  vf = c.vx * sinH + c.vz * cosH;
  vl = -c.vx * cosH + c.vz * sinH;
  const loose = 1 - 0.35 * clamp((sp - 24) / 14, 0, 1) * Math.abs(c.steer);
  const grip = s.grip * (hb ? 0.2 : 1) * loose;
  vl *= Math.exp(-grip * dt);
  vf *= 1 - 0.1 * clamp(Math.abs(vl) / 12, 0, 1) * dt * 6;      // sliding scrubs speed
  c.vx = sinH * vf - cosH * vl;
  c.vz = cosH * vf + sinH * vl;

  c.x += c.vx * dt;
  c.z += c.vz * dt;
  c.speed = vf;
  c.lat = vl;
  c.spin = vf * dt;
  c.accel = damp(c.accel, (vf - prevVf) / dt, 8, dt);
  c.latAccel = damp(c.latAccel, -c.yaw * vf, 8, dt);
  c.slide = damp(c.slide, clamp(Math.abs(vl) / 8, 0, 1), 12, dt);
  c.impact = Math.max(0, c.impact - dt * 2.2);
}

/** Keep the car on the road: bounce off the barriers, turn the nose back along the road, and
    settle the car on the surface. */
export function wallsAndHeight(c: Car, track: Track) {
  const limit = track.halfW + WALL_FACE - CAR_R;
  let yFront = c.y, yRear = c.y;
  for (const off of [CAR_OFF, -CAR_OFF]) {
    const cx = c.x + Math.sin(c.h) * off, cz = c.z + Math.cos(c.h) * off;
    const p = track.project(cx, cz, c.proj.i, tmp);
    if (off > 0) yFront = p.y; else yRear = p.y;
    const ad = Math.abs(p.d);
    if (ad > limit) {
      const pen = ad - limit, sign = p.d > 0 ? 1 : -1;
      const i = p.i;
      const nx = -track.tz[i] * sign, nz = track.tx[i] * sign;   // pointing out of the road
      c.x -= nx * pen; c.z -= nz * pen;
      const vn = c.vx * nx + c.vz * nz;
      if (vn > 0) {
        c.vx -= (1 + 0.22) * vn * nx; c.vz -= (1 + 0.22) * vn * nz;
        const f = clamp(1 - 0.012 * vn, 0.8, 1); c.vx *= f; c.vz *= f;
        const hit = clamp(vn / 16, 0, 1);
        c.impact = Math.max(c.impact, hit); c.hit = Math.max(c.hit, hit);
      }
      // turn the nose along the road, whichever way it is nearer to pointing
      let diff = wrapAngle(Math.atan2(track.tx[i], track.tz[i]) - c.h);
      if (Math.abs(diff) > Math.PI / 2) diff = wrapAngle(diff + Math.PI);
      c.h += diff * clamp(0.03 + vn * 0.012, 0, 0.35);
    }
  }
  const mid = track.project(c.x, c.z, c.proj.i, c.proj);
  c.y = mid.y;
  c.slope = (yFront - yRear) / (CAR_OFF * 2);
}

/** Cars bump into each other: separate them and trade some momentum */
export function collideCars(cars: Car[]) {
  const R2 = CAR_R * 2;
  for (let a = 0; a < cars.length; a++) {
    for (let b = a + 1; b < cars.length; b++) {
      const A = cars[a], B = cars[b];
      if ((A.x - B.x) ** 2 + (A.z - B.z) ** 2 > 36) continue;
      for (const oa of [CAR_OFF, -CAR_OFF]) for (const ob of [CAR_OFF, -CAR_OFF]) {
        const ax = A.x + Math.sin(A.h) * oa, az = A.z + Math.cos(A.h) * oa;
        const bx = B.x + Math.sin(B.h) * ob, bz = B.z + Math.cos(B.h) * ob;
        let dx = bx - ax, dz = bz - az;
        const d = Math.hypot(dx, dz);
        if (d >= R2 || d === 0) continue;
        dx /= d; dz /= d;
        const pen = R2 - d, ma = A.spec.phys.mass, mb = B.spec.phys.mass, tm = ma + mb;
        A.x -= dx * pen * (mb / tm); A.z -= dz * pen * (mb / tm);
        B.x += dx * pen * (ma / tm); B.z += dz * pen * (ma / tm);
        const vrel = (A.vx - B.vx) * dx + (A.vz - B.vz) * dz;
        if (vrel > 0) {
          const j = (1 + 0.35) * vrel / (1 / ma + 1 / mb);
          A.vx -= (j / ma) * dx; A.vz -= (j / ma) * dz;
          B.vx += (j / mb) * dx; B.vz += (j / mb) * dz;
          const hit = clamp(vrel / 14, 0, 1);
          A.impact = Math.max(A.impact, hit); B.impact = Math.max(B.impact, hit);
          A.hit = Math.max(A.hit, hit); B.hit = Math.max(B.hit, hit);
          // an off-centre hit swings the nose
          const nlA = dx * -Math.cos(A.h) + dz * Math.sin(A.h), nlB = dx * -Math.cos(B.h) + dz * Math.sin(B.h);
          A.h += 0.0045 * oa * nlA * (j / ma);
          B.h -= 0.0045 * ob * nlB * (j / mb);
        }
      }
    }
  }
}
