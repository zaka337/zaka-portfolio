/* Sound for MINI MAYHEM, made in the browser with the Web Audio API: an engine that rises and
   shifts through gears, tyre squeal, thumps, countdown beeps and a few little jingles. No sound
   files. It only starts after the player has pressed a button (browsers do not allow audio before
   that), it is on a master volume that mute sets to zero, and it all stops when the game closes. */

type Ctor = typeof AudioContext;
const getCtor = (): Ctor | undefined =>
  typeof window === "undefined" ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;

export class MayhemAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engGain: GainNode | null = null;
  private eng1: OscillatorNode | null = null;
  private eng2: OscillatorNode | null = null;
  private engLp: BiquadFilterNode | null = null;
  private squealGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted: boolean;
  private lastThump = 0;
  private lastShiftGear = 0;

  constructor(muted: boolean) { this.muted = muted; }

  /** Must be called from a click or key press */
  start() {
    if (this.ctx) { void this.ctx.resume?.(); return true; }
    const C = getCtor();
    if (!C) return false;
    try {
      const ctx = new C();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.5;
      master.connect(ctx.destination);
      this.master = master;
      // one second of noise for squeal and thumps
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
      // engine: two detuned oscillators through a low-pass filter
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; lp.Q.value = 2;
      const g = ctx.createGain(); g.gain.value = 0;
      const o1 = ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 50;
      const o2 = ctx.createOscillator(); o2.type = "square"; o2.frequency.value = 25;
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(master);
      o1.start(); o2.start();
      this.eng1 = o1; this.eng2 = o2; this.engLp = lp; this.engGain = g;
      // tyre squeal
      const sq = ctx.createBufferSource(); sq.buffer = nb; sq.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 5;
      const sg = ctx.createGain(); sg.gain.value = 0;
      sq.connect(bp); bp.connect(sg); sg.connect(master); sq.start();
      this.squealGain = sg;
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.04);
  }
  get isMuted() { return this.muted; }

  /** Called every frame while racing */
  engine(speedNorm: number, throttle: number, slide: number, on: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.eng1 || !this.eng2 || !this.engGain || !this.engLp || !this.squealGain) return;
    const t = ctx.currentTime;
    if (!on) {
      this.engGain.gain.setTargetAtTime(0, t, 0.05); this.squealGain.gain.setTargetAtTime(0, t, 0.05);
      return;
    }
    const gear = Math.min(4, Math.floor(speedNorm * 5));
    const rpm = 0.28 + 0.72 * (speedNorm * 5 - gear);
    this.lastShiftGear = gear;
    const f = 34 + rpm * 118 + gear * 6;
    this.eng1.frequency.setTargetAtTime(f, t, 0.03);
    this.eng2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.engLp.frequency.setTargetAtTime(380 + rpm * 1500 + throttle * 500, t, 0.05);
    this.engGain.gain.setTargetAtTime(0.06 + throttle * 0.1 + speedNorm * 0.04, t, 0.06);
    this.squealGain.gain.setTargetAtTime(Math.max(0, slide - 0.35) * 0.2 * Math.min(1, speedNorm * 3), t, 0.05);
  }
  idle() { this.engine(0, 0, 0, false); }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo = 0, delay = 0) {
    const ctx = this.ctx, m = this.master;
    if (!ctx || !m) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(m); o.start(t); o.stop(t + dur + 0.03);
  }

  beep(go: boolean) { this.tone(go ? 880 : 440, go ? 0.55 : 0.2, "square", go ? 0.22 : 0.16); }
  checkpoint() { this.tone(1046, 0.12, "triangle", 0.12); this.tone(1568, 0.14, "triangle", 0.1, 0, 0.07); }
  lap() { this.tone(659, 0.14, "triangle", 0.16); this.tone(880, 0.14, "triangle", 0.16, 0, 0.1); this.tone(1318, 0.3, "triangle", 0.16, 0, 0.2); }
  finish() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.28, "square", 0.13, 0, i * 0.11)); this.tone(2093, 0.7, "triangle", 0.12, 0, 0.6); }
  thump(strength: number) {
    const ctx = this.ctx, m = this.master;
    if (!ctx || !m || !this.noise) return;
    const now = ctx.currentTime;
    if (now - this.lastThump < 0.09) return;
    this.lastThump = now;
    const s = Math.min(1, Math.max(0.15, strength));
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500 + s * 1400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.4 * s, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(lp); lp.connect(g); g.connect(m); src.start(now, Math.random() * 0.5, 0.25);
    this.tone(140, 0.2, "sine", 0.4 * s, 45);
  }

  suspend() { void this.ctx?.suspend?.(); }
  resume() { void this.ctx?.resume?.(); }
  dispose() {
    try { this.eng1?.stop(); this.eng2?.stop(); } catch { /* already stopped */ }
    void this.ctx?.close?.();
    this.ctx = null; this.master = null;
  }
}
