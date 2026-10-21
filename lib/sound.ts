/* Sound: tiny made-up noises (typewriter clacks, a page turning, a printer tick, a splat). Nothing
   is downloaded: every sound is synthesised in the browser with the Web Audio API, so there are no
   audio files at all.

   It is OFF until the visitor turns it on (`sound` in the secret terminal) and the choice is kept
   on their own device. Turning it on has to happen inside a tap or key press, because that is the
   only time a browser allows audio to start; every later sound just uses that context. If the
   page is reloaded with sound on, the first tap or key press wakes the audio up again
   (components/Sound.tsx). */

export type SoundName =
  | "key" | "enter" | "page" | "chime" | "squash" | "tick" | "tear" | "whoosh" | "switch" | "ring";

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
