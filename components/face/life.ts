import { setFace, getFace, NEUTRAL } from "./expressions";
import { mirror, mirrorFace } from "@/lib/mirror";

/* The director of the face: decides WHEN he blinks, smiles, frowns or looks surprised, and hands the six
   weights to expressions.ts every frame. Nothing here draws anything.

   On his own (not in calm mode, not asleep)
     blink      every 2.4 to 6 seconds, one in five is a double blink
     smile      a small one now and then, a few seconds long
   Because of what you do
     hover      the pointer over the face: a friendly half smile (the cursor turns into  :)  at the same time)
     hold       press and hold the head: he winks and grins (the cursor turns into  ;)  at the same time)
     squish     dragging the cheeks like putty: eyes screwed up, a goofy grin
   Because of what he says (every speech bubble is a "zk-say" event, so this follows the avatar's own words)
     HEY THERE! HI, I'M ZAKA ...   a smile        WHOA...  HONK!   surprise (brows up, a blink)
     WHATEVER.                     annoyed        OW!              ouch (brows down, eyes shut)
     RESTORED.                     relief         LET'S BUILD ...  a smile and a wink
   While the camera mirrors the visitor (Shift+C or the terminal's `camera`) he shows THEIR face instead:
   blinks, winks, smiles, frowns and brows are copied (lib/mirror.ts, components/LookBack.tsx), and
   nothing of his own is started meanwhile.
   Because of his state
     dizzy      brows up, eyes fluttering      talking   a slight smile, brows that move with the voice
     asleep     the eyes close as he nods off (and he stays that way until he is woken)

   Calm mode (reduced motion) keeps what YOU make happen (hover, hold, greetings) but starts nothing by
   itself and does not flutter. */

export interface LifeInput {
  calm: boolean;
  /** 0 awake .. 1 fast asleep (AvatarScene's eased sleep weight) */
  sleep: number;
  dizzy: boolean;
  /** the head is being held */
  grabbed: boolean;
  /** the cheeks are being dragged like putty */
  squished: boolean;
  talking: boolean;
}

type Kind = "smile" | "surprise" | "annoyed" | "ouch" | "relief" | "wink";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const sstep = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
/** 0 up to 1 over `up` seconds, holds for `hold`, back to 0 over `down` */
const pulse = (age: number, up: number, hold: number, down: number) =>
  age < 0 ? 0 : age < up ? sstep(age / up) : age < up + hold ? 1 : age < up + hold + down ? 1 - sstep((age - up - hold) / down) : 0;
/** One blink, 0.26 s: the lids close fast, stay shut a moment, open a little slower */
const blinkCurve = (age: number) => (age < 0 ? 0 : age < 0.08 ? sstep(age / 0.08) : age < 0.12 ? 1 : age < 0.26 ? 1 - sstep((age - 0.12) / 0.14) : 0);
const blink = (at: number, k = 1) => state.blinks.push({ at, k: k * rand(0.88, 1.18) });

function classify(text: string): Kind | null {
  const t = text.toUpperCase();
  if (/LET'?S BUILD/.test(t)) return "wink";
  if (/^(HEY|HI\b|HELLO|NICE TO|WELCOME)/.test(t)) return "smile";
  if (/WHOA|HONK|BOOP/.test(t)) return "surprise";
  if (/WHATEVER/.test(t)) return "annoyed";
  if (/^OW\b/.test(t)) return "ouch";
  if (/RESTORED/.test(t)) return "relief";
  return null;
}

const state = {
  now: 0,
  smile: 0, frown: 0, browUp: 0, browDown: 0,       // smoothed
  blinks: [] as { at: number; k: number }[], // start time and how slow this one is (1 = normal)
  asym: 0,
  nextBlink: 1.2,
  nextSmile: 11,
  smileAt: -99,
  moments: [] as { kind: Kind; at: number }[],
  hover: 0, hoverOn: false,
  grab: 0,
  attached: 0,
  paused: false, // tests: hold the face still for a screenshot
};

/** Something happened that he reacts to (for tests too). Several of the same kind in a moment count once. */
function moment(kind: Kind) {
  for (const m of state.moments) if (m.kind === kind && state.now - m.at < 0.4) return;
  state.moments.push({ kind, at: state.now });
  if (kind === "surprise" || kind === "smile" || kind === "wink") state.asym = rand(-1, 1) * 0.8; // one side of a smile a little stronger
  if (kind === "surprise" || kind === "smile") blink(state.now + (kind === "surprise" ? 0.55 : 0.9)); // a blink as it sinks in
}

export const life = {
  moment,
  /** Listens for what he says and for the pointer over his face. Returns the cleanup. */
  attach(): () => void {
    const onSay = (e: Event) => {
      const k = classify(String((e as CustomEvent<{ text?: string }>).detail?.text ?? ""));
      if (k) moment(k);
    };
    const onNod = () => moment("smile");
    const face = (n: EventTarget | null) => (n instanceof Element ? n.closest(".face-hit") : null);
    const onOver = (e: PointerEvent) => { if (e.pointerType === "mouse" && face(e.target)) state.hoverOn = true; };
    const onOut = (e: PointerEvent) => { if (face(e.target) && !face(e.relatedTarget)) state.hoverOn = false; };
    window.addEventListener("zk-say", onSay);
    window.addEventListener("zk-nod", onNod);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    if (/[?&]test(&|$)/.test(location.search)) (window as unknown as { __faceLife?: unknown }).__faceLife = { moment, state, face: getFace, set: setFace, pause: (p: boolean) => { state.paused = p; }, mirrorFace, mirror };
    state.attached++;
    return () => {
      window.removeEventListener("zk-say", onSay);
      window.removeEventListener("zk-nod", onNod);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      state.attached--;
      state.hoverOn = false;
      setFace(NEUTRAL);
    };
  },

  /** Once a frame, from the avatar's render loop */
  update(delta: number, inp: LifeInput) {
    if (state.paused) return;
    // real time, so a slow device does not slow his face down; capped so a long pause (a hidden tab) is not one huge step
    const dt = Math.min(0.25, Math.max(0, delta));
    state.now += dt;
    const t = state.now;
    const awake = inp.sleep < 0.15;
    const mw = Math.min(1, Math.max(0, mirror.weight)); // 0..1: how much he is copying the visitor's face right now
    const idle = !inp.calm && awake && mw < 0.5;        // may he start things on his own?

    // ── blinking on his own
    if (idle && t >= state.nextBlink) {
      blink(t);
      if (Math.random() < 0.2) blink(t + 0.27);
      else if (Math.random() < 0.08) blink(t, 1.7);                         // now and then a slow, heavy blink
      state.nextBlink = t + rand(2.4, 6.0);
    }
    let blinkL = 0, blinkR = 0;
    for (let i = state.blinks.length - 1; i >= 0; i--) {
      const b = state.blinks[i];
      const age = t - b.at;
      if (age > 0.6) { state.blinks.splice(i, 1); continue; }
      blinkL = Math.max(blinkL, blinkCurve(age / b.k));
      blinkR = Math.max(blinkR, 0.97 * blinkCurve((age - 0.014) / b.k)); // the other eye is a hair behind
    }

    // ── what he is feeling: the biggest of everything that is on right now
    let smile = 0, frown = 0, up = 0, down = 0, squint = 0, wink = 0;
    for (let i = state.moments.length - 1; i >= 0; i--) {
      const m = state.moments[i];
      const age = t - m.at;
      if (age > 4) { state.moments.splice(i, 1); continue; }
      switch (m.kind) {
        case "smile":    smile = Math.max(smile, pulse(age, 0.18, 1.5, 0.9)); break;
        case "wink":     smile = Math.max(smile, 0.85 * pulse(age, 0.2, 1.4, 0.9)); wink = Math.max(wink, pulse(age - 0.45, 0.08, 0.3, 0.18)); break;
        case "surprise": up = Math.max(up, pulse(age, 0.1, 0.9, 0.7)); break;
        case "annoyed": { const p = pulse(age, 0.2, 1.2, 0.8); down = Math.max(down, 0.9 * p); frown = Math.max(frown, 0.5 * p); break; }
        case "ouch":    { const p = pulse(age, 0.05, 0.5, 0.6); down = Math.max(down, 0.8 * p); frown = Math.max(frown, 0.7 * p); squint = Math.max(squint, 0.85 * p); break; }
        case "relief":   { const p = pulse(age, 0.3, 1.0, 1.0); smile = Math.max(smile, 0.7 * p); up = Math.max(up, 0.1 * p); break; }
      }
    }
    // hovering: a friendly half smile and a touch of interest
    state.hover += ((state.hoverOn && awake ? 1 : 0) - state.hover) * (1 - Math.exp(-dt * 6));
    smile = Math.max(smile, 0.45 * state.hover); up = Math.max(up, 0.15 * state.hover);
    // held: he winks and grins; dragging the cheeks like putty: eyes screwed up, a goofy grin
    state.grab += ((inp.grabbed && awake ? 1 : 0) - state.grab) * (1 - Math.exp(-dt * 14));
    wink = Math.max(wink, 0.95 * state.grab); smile = Math.max(smile, 0.6 * state.grab);
    if (inp.squished) { squint = Math.max(squint, 0.55); smile = Math.max(smile, 0.5); }
    // dizzy: brows up, eyes fluttering
    if (inp.dizzy) { up = Math.max(up, 0.75); if (!inp.calm) squint = Math.max(squint, 0.5 * (0.5 + 0.5 * Math.sin(t * 15))); }
    // talking: a slight smile and brows that move with the voice
    if (inp.talking) { smile = Math.max(smile, 0.22); up = Math.max(up, inp.calm ? 0.1 : 0.12 + 0.08 * Math.sin(t * 5.3)); }
    // now and then, when nothing is going on, a small smile
    if (idle && !inp.talking) {
      if (t >= state.nextSmile) { state.smileAt = t; state.nextSmile = t + rand(14, 30); state.asym = rand(-1, 1) * 0.8; }
      smile = Math.max(smile, 0.4 * pulse(t - state.smileAt, 0.6, 1.8, 1.2));
    }
    // asleep: the eyes close as he nods off, heavy brows
    const lid = sstep((inp.sleep - 0.1) / 0.45);
    down = Math.max(down, 0.12 * lid);

    // ── ease the face toward it (the lids are driven straight: a blink is already a curve)
    const k = 1 - Math.exp(-dt * 9);
    state.smile += (smile - state.smile) * k;
    state.frown += (frown - state.frown) * k;
    state.browUp += (up - state.browUp) * k;
    state.browDown += (down - state.browDown) * k;
    // a real smile squeezes the eyes a little
    const cheek = 0.16 * state.smile;
    const both = Math.max(lid * 0.98, squint, cheek);
    // while the camera mirrors the visitor, their face takes over (eased in and out with the head copy)
    const f = mirrorFace;
    const mix = (own: number, theirs: number) => own + (theirs - own) * mw;
    setFace({
      smile: mix(state.smile, f.smile), frown: mix(state.frown, f.frown), browUp: mix(state.browUp, f.browUp),
      browDown: mix(state.browDown, f.browDown), asym: mix(state.asym, f.asym),
      blinkL: mix(Math.max(blinkL, both), f.blinkL),
      blinkR: mix(Math.max(blinkR, both, wink), f.blinkR),
    });
  },
};
