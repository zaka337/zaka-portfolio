/* Sound: tiny made-up noises (typewriter clacks, a page turning, a printer tick, a splat). Nothing
   is downloaded: every sound is synthesised in the browser with the Web Audio API, so there are no
   audio files at all.

   It is OFF until the visitor turns it on (`sound` in the secret terminal, or the "Tap for sound"
   button the home screen's intro offers) and the choice is kept on their own device. Turning it on has to happen inside a tap or key press, because that is the
   only time a browser allows audio to start; every later sound just uses that context. If the
   page is reloaded with sound on, the first tap or key press wakes the audio up again
   (components/Sound.tsx). */

export type SoundName =
  | "key" | "enter" | "page" | "chime" | "squash" | "tick" | "tear" | "whoosh" | "switch" | "ring" | "honk";

/* Sounds for the home screen's multi-cursor build (components/homebuild/director.ts). Same engine, same rules: nothing plays unless the
   visitor has sound on and the audio is awake. They are "cues" rather than `play()` sounds because the build fires many in quick
   succession (a pencil stroke every few hundredths of a second) and knows each one's length and which cursor it belongs to. */
export type CueName = "appear" | "click" | "type" | "scratch" | "marker" | "slide" | "zip" | "pop" | "grab" | "chord" | "bloom" | "hello" | "pip";
export interface CueOpts { note?: number; dur?: number; gain?: number }

const KEY = "zk-sound";

type Ctor = typeof AudioContext;
const getCtor = (): Ctor | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled: boolean | null = null;
const lastAt: Partial<Record<SoundName, number>> = {};

export function soundOn(): boolean {
  if (enabled === null) {
    try { enabled = window.localStorage.getItem(KEY) === "1"; } catch { enabled = false; }
  }
  return enabled;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const C = getCtor();
  if (!C) return null;
  try {
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    // One second of white noise, reused by every sound that needs a hiss or a click
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Turn sound on or off. Turning it on must be called straight from a tap or key press. */
export function setSound(on: boolean): boolean {
  enabled = on;
  try { window.localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage refused: it still works this visit */ }
  if (on) {
    const c = ensure();
    if (!c) { enabled = false; return false; }
    // The confirmation tick plays as soon as the audio is awake
    const r = c.resume?.();
    if (r && typeof r.then === "function") r.then(() => play("tick"), () => {});
    else play("tick");
  }
  return true;
}

/** Wake the audio up (called from the first tap or key press after a reload) */
export function unlockSound() {
  if (!soundOn()) return;
  const c = ensure();
  if (c && c.state !== "running") void c.resume?.();
}

/** Sound is on AND the audio is awake right now (a browser keeps it asleep until the visitor's first tap or key press) */
export function audioRunning(): boolean {
  if (!soundOn()) return false;
  const c = ensure();
  return !!c && c.state === "running";
}

/* A short burst of noise through a filter, with a quick attack and an exponential fade */
function burst(t: number, dur: number, o: { type: BiquadFilterType; from: number; to?: number; q?: number; gain: number }) {
  if (!ctx || !master || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.gain, t + Math.min(0.006, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5, dur + 0.02);
}

function tone(t: number, dur: number, o: { type?: OscillatorType; from: number; to?: number; gain: number }) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.from, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.gain, t + Math.min(0.008, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const jitter = (v: number, pct = 0.12) => v * (1 + (Math.random() * 2 - 1) * pct);

export function play(name: SoundName) {
  if (!soundOn()) return;
  const c = ensure();
  if (!c) return;
  // A suspended context would queue the sound and let it out late: skip it and try to wake up instead
  if (c.state !== "running") { void c.resume?.(); return; }
  const now = performance.now();
  if (now - (lastAt[name] ?? -1e9) < 22) return; // key repeat and rapid events: never a machine-gun
  lastAt[name] = now;
  const t = c.currentTime + 0.002;

  switch (name) {
    case "key":
      burst(t, 0.024, { type: "bandpass", from: jitter(2600), q: 1.1, gain: 0.5 });
      tone(t, 0.03, { from: jitter(170), to: 90, gain: 0.22 });
      break;
    case "enter":
      burst(t, 0.04, { type: "bandpass", from: 1500, q: 0.9, gain: 0.6 });
      tone(t, 0.07, { from: 120, to: 70, gain: 0.34 });
      break;
    case "page": // paper moving: a soft rising hiss
      burst(t, 0.24, { type: "bandpass", from: 700, to: 2600, q: 0.7, gain: 0.26 });
      break;
    case "chime": // a secret found
      tone(t, 0.42, { from: 880, gain: 0.16 });
      tone(t + 0.11, 0.55, { from: 1318, gain: 0.14 });
      break;
    case "honk": // a clown horn: two flat, buzzy notes
      tone(t, 0.12, { type: "sawtooth", from: 392, gain: 0.3 });
      tone(t + 0.13, 0.2, { type: "sawtooth", from: 311, to: 294, gain: 0.3 });
      break;
    case "squash":
      tone(t, 0.14, { from: 190, to: 48, gain: 0.4 });
      burst(t, 0.07, { type: "lowpass", from: 1100, to: 300, q: 0.8, gain: 0.45 });
      break;
    case "tick": // a thermal printer
      burst(t, 0.014, { type: "highpass", from: jitter(3600), q: 0.8, gain: 0.34 });
      break;
    case "tear":
      burst(t, 0.22, { type: "highpass", from: 1200, to: 5200, q: 0.9, gain: 0.34 });
      break;
    case "whoosh": // a paper plane leaving
      burst(t, 0.7, { type: "bandpass", from: 500, to: 3000, q: 0.8, gain: 0.22 });
      break;
    case "switch": // a lamp or a light switch
      burst(t, 0.012, { type: "highpass", from: 2400, q: 0.9, gain: 0.5 });
      tone(t, 0.03, { from: 980, to: 420, gain: 0.2 });
      break;
    case "ring": // a little retro phone chirp: three short beeps
      for (let i = 0; i < 3; i++) tone(t + i * 0.11, 0.07, { type: "square", from: i === 1 ? 1320 : 1040, gain: 0.07 });
      break;
  }
}

/* The pencil. About ninety short strokes are drawn in four seconds, so a fresh set of audio nodes for each would be the most expensive
   thing in the whole build. Instead two long-lived "pen voices" (looping noise -> band-pass -> gain) are only re-automated per stroke:
   no nodes are created while the animation runs. They are torn down a moment after the last stroke. */
type PenVoice = { src: AudioBufferSourceNode; f: BiquadFilterNode; g: GainNode };
let pens: PenVoice[] = [];
let penTurn = 0;
let penTimer = 0;
function penStroke(t: number, dur: number, gain: number) {
  if (!ctx || !master || !noise) return;
  if (!pens.length) {
    for (let i = 0; i < 2; i++) {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8; f.frequency.value = 3000;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(0, Math.random() * 0.5);
      pens.push({ src, f, g });
    }
  }
  const p = pens[penTurn++ % 2], d = Math.max(0.03, Math.min(dur, 0.5));
  p.g.gain.cancelScheduledValues(t);
  p.g.gain.setValueAtTime(0.0001, t);
  p.g.gain.linearRampToValueAtTime(gain, t + Math.min(0.006, d / 3));
  p.g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  p.f.frequency.cancelScheduledValues(t);
  p.f.frequency.setValueAtTime(jitter(2300, 0.3), t);
  p.f.frequency.exponentialRampToValueAtTime(jitter(3700, 0.3), t + d);
  window.clearTimeout(penTimer);
  penTimer = window.setTimeout(() => {
    pens.forEach((v) => { try { v.src.stop(); v.src.disconnect(); v.f.disconnect(); v.g.disconnect(); } catch { /* already gone */ } });
    pens = [];
  }, 1800);
}

/** One cue of the home build. `note` is the cursor's own note (each of the five owns one tone of a C major chord, so any of them
    sounding together is consonant), `dur` the length of the thing it accompanies, `gain` a multiplier. Never throttled: the build
    decides how many there are. Quiet by design: the sounds sit under the page, they do not shout over it. */
export function cue(name: CueName, o: CueOpts = {}) {
  if (!soundOn()) return;
  const c = ensure();
  if (!c || c.state !== "running") return;
  const t = c.currentTime + 0.002, g = o.gain ?? 1, n = o.note ?? 784, d = o.dur ?? 0.1;
  switch (name) {
    case "appear": // a cursor arrives: a small upward blip in its own note
      tone(t, 0.14, { from: n * 0.5, to: n, gain: 0.045 * g });
      break;
    case "click": // a soft mouse click, ringing a little in the cursor's note
      burst(t, 0.016, { type: "highpass", from: jitter(3000), q: 0.8, gain: 0.15 * g });
      tone(t, 0.12, { from: n, gain: 0.05 * g });
      break;
    case "type": // a quiet key
      burst(t, 0.022, { type: "bandpass", from: jitter(2800), q: 1.1, gain: 0.2 * g });
      tone(t, 0.026, { from: jitter(190), to: 100, gain: 0.09 * g });
      break;
    case "scratch": // pencil on paper, as long as the stroke
      penStroke(t, d, 0.075 * g);
      break;
    case "marker": // the thick brim being filled in
      burst(t, Math.max(0.1, Math.min(d, 1.2)), { type: "lowpass", from: 700, to: 2200, q: 0.6, gain: 0.11 * g });
      break;
    case "slide": // a block of paper slides in
      burst(t, Math.max(0.12, Math.min(d, 0.6)), { type: "bandpass", from: 600, to: 2200, q: 0.7, gain: 0.1 * g });
      break;
    case "zip": // a guide line is dragged down the page
      burst(t, Math.max(0.1, Math.min(d, 0.5)), { type: "bandpass", from: 1000, to: 5200, q: 0.9, gain: 0.08 * g });
      break;
    case "pop": // a badge pops into place
      tone(t, 0.1, { from: n * 0.8, to: n * 1.25, gain: 0.06 * g });
      burst(t, 0.012, { type: "highpass", from: 2800, q: 0.9, gain: 0.12 * g });
      break;
    case "grab": // the cursors take hold of the head's frame
      burst(t, 0.03, { type: "highpass", from: 1800, q: 0.9, gain: 0.1 * g });
      tone(t, 0.06, { from: n * 0.5, gain: 0.05 * g });
      break;
    case "chord": // the shared click: one soft chord, a low thump and a click
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(t + i * 0.012, 0.9, { type: "triangle", from: f, gain: 0.035 * g }));
      tone(t, 0.7, { type: "triangle", from: 130.81, gain: 0.07 * g });
      tone(t, 0.22, { from: 110, to: 52, gain: 0.2 * g });
      burst(t, 0.03, { type: "highpass", from: 2200, q: 0.9, gain: 0.2 * g });
      break;
    case "bloom": // the real head comes in: a rising sweep, then four bright notes
      burst(t, 0.85, { type: "bandpass", from: 300, to: 2600, q: 0.7, gain: 0.14 * g });
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + 0.12 + i * 0.075, 0.7, { from: f, gain: 0.07 * g }));
      break;
    case "hello": // the head's own hello
      tone(t, 0.1, { from: 988, gain: 0.07 * g });
      tone(t + 0.11, 0.16, { from: 1318.5, gain: 0.07 * g });
      break;
    case "pip": // a cursor turns back into the site's full stop
      tone(t, 0.08, { from: n, to: n * 0.6, gain: 0.05 * g });
      break;
  }
}
