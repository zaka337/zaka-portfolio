"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { understand, type Reply } from "@/lib/voiceIntents";
import { crumblePage } from "@/lib/crumble";
import { found } from "@/lib/secrets";
import "./voice.css";

/* Talk to the portfolio. Run `talk` in the secret terminal (or press Shift+V), say something
   like "show me your projects" or "are you available?", and the avatar answers out loud, its
   head swaying as it speaks, and takes you there.

   It uses the browser's own speech recognition and voice: no server of ours and no AI, just the
   keyword answers in lib/voiceIntents.ts, so it can only say true things about Zaka. The
   browser's speech service does hear the audio (a note says so the first time). A browser that
   cannot listen gets a text box instead. */

type Phase = "idle" | "listening" | "thinking" | "speaking";

interface Rec {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface RecEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
const getRecognition = () => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const talking = (on: boolean) => window.dispatchEvent(new CustomEvent("zk-talking", { detail: on }));

/* A calm English voice, if the device has one; otherwise whatever it defaults to */
function pickVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis?.getVoices?.() ?? [];
  const en = all.filter((v) => /^en[-_]/i.test(v.lang));
  const liked = /(daniel|alex|aaron|fred|arthur|oliver|google uk english male|google us english|microsoft (guy|mark|david|ryan|george)|male)/i;
  return en.find((v) => liked.test(v.name)) ?? en.find((v) => /en[-_](gb|us)/i.test(v.lang)) ?? en[0] ?? null;
}

/* Speak, and call `done` when finished (or when the browser forgets to say it did) */
function speak(text: string, done?: () => void) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    talking(false);
    done?.();
  };
  if (!synth) { end(); return; }
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
    u.rate = 1.02;
    u.pitch = 0.92;
    u.onstart = () => talking(true);
    u.onend = end;
    u.onerror = end;
    synth.speak(u);
    window.setTimeout(end, Math.max(3500, text.length * 95)); // some phones never report the end
  } catch {
    end();
  }
}

export default function Voice() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [link, setLink] = useState<Reply["link"] | null>(null);
  const [note, setNote] = useState("");
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const rec = useRef<Rec | null>(null);
  const run = useRef(0);          // bumped to cancel whatever is in flight
  const hide = useRef(0);         // the auto-hide timer
  const toldPrivacy = useRef(false);

  const stopAll = useCallback(() => {
    run.current++;
    window.clearTimeout(hide.current);
    try { rec.current?.abort(); } catch { /* already over */ }
    rec.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* none */ }
    talking(false);
  }, []);

  const close = useCallback(() => {
    stopAll();
    setOpen(false);
    setPhase("idle");
    setHeard(""); setReply(""); setLink(null); setNote(""); setTyping(false); setText("");
  }, [stopAll]);

  const later = useCallback((ms: number) => {
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(close, ms);
  }, [close]);

  /* What was said: understand it, answer out loud, then do what was asked */
  const respond = useCallback((said: string) => {
    const id = run.current;
    window.clearTimeout(hide.current);
    setPhase("thinking");
    setHeard(said.trim());
    setNote("");
    const r = understand(said);
    if (r.act === "stop") { close(); return; }
    found("talk");
    setReply(r.say);
    setLink(r.link ?? null);
    // A theme change is instant; the rest waits for the sentence to finish
    if (r.act === "dark" || r.act === "light") {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      if (cur !== r.act) (document.querySelector(".theme-toggle") as HTMLButtonElement | null)?.click();
    }
    setPhase("speaking");
    speak(r.say, () => {
      if (run.current !== id) return;
      setPhase("idle");
      if (r.act === "crumble") { close(); void crumblePage(); return; }
      if (r.act === "xray") { close(); window.dispatchEvent(new Event("zk-xray")); return; }
      if (r.act === "terminal") { close(); window.dispatchEvent(new Event("zk-terminal")); return; }
      if (r.act === "tour") { close(); window.dispatchEvent(new Event("zk-tour")); return; }
      if (r.act === "receipt") { close(); window.dispatchEvent(new Event("zk-receipt")); return; }
      if (r.act === "lamp" || r.act === "lampoff") { close(); window.dispatchEvent(new CustomEvent("zk-lamp", { detail: r.act === "lamp" })); return; }
      if (r.go) router.push(r.go);
      later(r.link ? 14000 : 8000);
    });
  }, [close, later, router]);

  const listen = useCallback(() => {
    const Recognition = getRecognition();
    if (!Recognition) {
      setTyping(true);
      setNote("This browser cannot hear me. Type to me instead.");
      setPhase("idle");
      return;
    }
    stopAll();
    const id = run.current;
    const r = new Recognition();
    rec.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let said = "";
    let failure = "";
    r.onstart = () => {
      if (run.current !== id) return;
      setPhase("listening");
      setHeard(""); setReply(""); setLink(null);
      if (!toldPrivacy.current) {
        toldPrivacy.current = true;
        setNote("Your browser's speech service hears this. This site keeps nothing.");
      }
    };
    r.onresult = (e) => {
      if (run.current !== id) return;
      let finalText = "", interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const part = e.results[i];
        if (part.isFinal) finalText += part[0].transcript;
        else interim += part[0].transcript;
      }
      said = finalText || interim;
      setHeard(said);
    };
    r.onerror = (e) => { failure = e.error; };
    r.onend = () => {
      if (run.current !== id) return;
      rec.current = null;
      if (said.trim()) { respond(said); return; }
      setPhase("idle");
      if (failure === "not-allowed" || failure === "service-not-allowed") {
        setTyping(true);
        setNote("I need the microphone to hear you. Allow it in your browser, or type to me.");
      } else if (failure === "network") {
        setTyping(true);
        setNote("The speech service is out of reach. Type to me instead.");
      } else {
        setNote("I did not hear anything. Tap to try again.");
      }
      later(10000);
    };
    try { r.start(); } catch { setNote("I could not start listening. Type to me instead."); setTyping(true); }
  }, [stopAll, respond, later]);

  /* Entry points. Both run inside a key press or tap, which is when browsers allow the
     microphone and speech. The silent word below unlocks speech on iPhones for the rest of the visit. */
  const begin = useCallback(() => {
    try {
      const unlock = new SpeechSynthesisUtterance(" ");
      unlock.volume = 0;
      window.speechSynthesis?.speak(unlock);
    } catch { /* no speech here */ }
    setOpen(true);
    listen();
  }, [listen]);

  // The triggers are registered once and call the latest `begin`; stopping on unmount is its own effect,
  // so nothing that re-runs can ever cut an answer off.
  const beginRef = useRef(begin);
  useEffect(() => { beginRef.current = begin; }, [begin]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.code !== "KeyV" || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      beginRef.current();
    };
    const onVoice = () => beginRef.current();
    const onSay = (e: Event) => {
      const said = (e as CustomEvent<string>).detail;
      if (said) speak(said);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("zk-voice", onVoice);
    window.addEventListener("zk-voice-say", onSay);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("zk-voice", onVoice);
      window.removeEventListener("zk-voice-say", onSay);
    };
  }, []);
  useEffect(() => () => stopAll(), [stopAll]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, close]);

  if (!open) return null;

  const label = phase === "listening" ? "Listening" : phase === "thinking" ? "Thinking" : "Zaka";

  return (
    <div className="vc-caption" role="status" aria-live="polite">
      <div className="vc-head">
        <span className={`vc-dot is-${phase}`} aria-hidden="true" />
        <span className="vc-state">{label}</span>
        <button type="button" className="vc-x" aria-label="Stop" onClick={close}>{'×'}</button>
      </div>
      {heard && <div className="vc-heard">{heard}</div>}
      {reply && <div className="vc-reply">{reply}</div>}
      {note && <div className="vc-note">{note}</div>}
      <div className="vc-actions">
        {link && (
          <a className="vc-btn" href={link.href} target="_blank" rel="noopener noreferrer">{link.label} {'↗'}</a>
        )}
        {phase === "idle" && <button type="button" className="vc-btn" onClick={() => { setNote(""); listen(); }}>Tap to ask again</button>}
        {!typing && <button type="button" className="vc-btn vc-ghost" onClick={() => setTyping(true)}>Type instead</button>}
      </div>
      {typing && (
        <form
          className="vc-form"
          onSubmit={(e) => {
            e.preventDefault();
            const said = text;
            setText("");
            if (said.trim()) { stopAll(); respond(said); }
          }}
        >
          <input
            className="vc-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask me something..."
            aria-label="Type to Zaka"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </form>
      )}
    </div>
  );
}
