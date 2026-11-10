"use client";

import { useEffect, useRef, useState } from "react";
import { audioRunning, setSound, unlockSound } from "@/lib/sound";
import { startBuild, type BuildHandle } from "./director";

/* The multi-cursor build of the home screen (see director.ts for how it works and what it promises).

   When it plays:
   - on the first visit of a session, when the boot script in app/page.tsx armed it (window.__zbArmed) before the first paint;
   - when the address has ?build (a replay link, and the test switch: &t=2.4 freezes it at that second, &speed=0.5 is slow motion,
     &lite=1 is the phone version);
   - when someone types `rebuild` in the hidden terminal (lib/homeBuild.ts asks for it).
   It never plays for reduced motion, the "calm" setting, Save-Data or crawlers (the boot script decides), and if anything is
   unsupported or fails, the page is simply shown as it is. */

const CURSORS: Array<{ id: string; name: string; role: string; color: string }> = [
  { id: "c1", name: "Next.js", role: "layout", color: "#ff9b6e" },
  { id: "c2", name: "React", role: "components", color: "#8ec0ff" },
  { id: "c3", name: "TypeScript", role: "type", color: "#7ddfa8" },
  { id: "c4", name: "Three.js", role: "3D", color: "#c3a6ff" },
  { id: "c5", name: "CSS", role: "style", color: "#ffd36b" },
];

const Handles = ({ n }: { n: number }) => <>{Array.from({ length: n }, (_, i) => <i key={i} />)}</>;

type W = { __zbArmed?: boolean; __zkRebuild?: number; __zb?: BuildHandle };

export default function HomeBuild() {
  const ref = useRef<HTMLDivElement>(null);
  // The build has sound (lib/sound.ts), but a browser only lets audio start after a tap or key press, and the build starts by itself.
  // So while it runs, a small "Tap for sound" button is offered unless the audio is already awake. The tap turns sound on for good
  // (the same switch as `sound` in the terminal) and the rest of the build is heard.
  const [snd, setSnd] = useState<"hidden" | "ask" | "thanks">("hidden");
  const thanksTimer = useRef(0);
  const onSound = () => {
    const ok = setSound(true); // inside the tap: this is what lets the browser start the audio
    unlockSound();
    setSnd(ok ? "thanks" : "hidden");
    window.clearTimeout(thanksTimer.current);
    if (ok) thanksTimer.current = window.setTimeout(() => setSnd("hidden"), 1600);
  };
  useEffect(() => {
    // offered the moment the choreography really starts (after the loader), not while the loader still covers the page
    const onPlay = () => setSnd(audioRunning() ? "hidden" : "ask");
    window.addEventListener("zk-build-play", onPlay);
    return () => { window.removeEventListener("zk-build-play", onPlay); window.clearTimeout(thanksTimer.current); };
  }, []);

  useEffect(() => {
    const layer = ref.current;
    const root = document.documentElement;
    const w = window as unknown as W;
    if (!layer) return;
    const q = new URLSearchParams(location.search);
    const seek = q.has("t") ? Number(q.get("t")) : undefined;
    const speed = q.has("speed") ? Number(q.get("speed")) : undefined;
    const ua = navigator.userAgent || "";
    // the phone layout (and the in-app browsers of Instagram, LinkedIn and friends) get the short version: three cursors
    const lite = q.has("lite") || window.matchMedia("(max-width: 768px)").matches || /FBAN|FBAV|Instagram|LinkedInApp|Snapchat|TikTok|musical_ly|Twitter/i.test(ua);
    let handle: BuildHandle | null = null;
    let cancelled = false;

    // wait for the fonts (every rectangle is measured on the final layout) and for the 3D scene's wrapper, which only exists
    // once its own code has loaded (it is a dynamic import). A timer, not requestAnimationFrame: a background tab or a hidden
    // pane runs no animation frames, and the start must not wait for one.
    const waitScene = () => new Promise<void>((res) => {
      const t0 = performance.now();
      const tick = () => { if (cancelled || document.querySelector(".avatar-scene") || performance.now() - t0 > 4500) res(); else window.setTimeout(tick, 40); };
      tick();
    });
    const launch = (replay: boolean) => {
      if (handle && !handle.done) return; // already running
      (document.fonts?.ready ?? Promise.resolve()).then(waitScene).then(() => {
        if (cancelled || (handle && !handle.done)) return;
        try {
          // add the classes and start in the same task: no frame is painted in between, so the home never flashes
          if (replay) root.classList.remove("zb-done", "zb-head");
          root.classList.add("zb");
          handle = startBuild(layer, { lite, seek: Number.isFinite(seek) ? seek : undefined, speed: Number.isFinite(speed) ? speed : undefined });
          if (handle) w.__zb = handle;
          else root.classList.remove("zb");
        } catch (err) {
          console.error("the home build could not start", err);
          root.classList.remove("zb", "zb-live");
        }
      });
    };

    const onAsk = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.hasAttribute("data-calm")) return;
      launch(true);
    };
    window.addEventListener("zk-rebuild", onAsk);
    if (w.__zbArmed) launch(false);
    else if (w.__zkRebuild && Date.now() - w.__zkRebuild < 20000) { w.__zkRebuild = 0; onAsk(); } // asked from another page: replay now that the home is here

    return () => {
      cancelled = true;
      window.removeEventListener("zk-rebuild", onAsk);
      handle?.destroy();
      root.classList.remove("zb", "zb-live", "zb-head", "zb-done");
    };
  }, []);

  return (
    <>
    <button type="button" className="zb-sound" data-state={snd} onClick={onSound} aria-label="Turn on sound for this intro">
      <svg viewBox="0 0 20 16" width="16" height="13" aria-hidden="true"><path d="M1 5.5h3.6L9 2v12L4.6 10.5H1z" /><path d="M12.2 5.2c1.4 1.5 1.4 4.1 0 5.6M14.6 3c2.6 2.7 2.6 7.3 0 10" /></svg>
      <span>{snd === "thanks" ? "Sound on" : "Tap for sound"}</span>
    </button>
    <div ref={ref} className="zb-layer" aria-hidden="true">
      <div className="zb-grid" data-zb-el="grid" />
      <svg className="zb-marks" data-zb-el="marks"><path d="" /></svg>
      <div className="zb-guide" data-zb-el="guide" />
      <canvas className="zb-sketch" data-zb-el="sketch" />
      <div className="zb-frame" data-zb-el="titleFrame"><Handles n={4} /><span className="zb-label" /></div>
      <div className="zb-frame zb-frame-head" data-zb-el="headFrame"><Handles n={8} /><span className="zb-label" /></div>
      {[0, 1, 2, 3].map((n) => <div key={n} className="zb-sel" data-zb-el={`sel${n}`}><Handles n={4} /></div>)}
      <div className="zb-caret" data-zb-el="caret" />
      {Array.from({ length: 16 }, (_, i) => <div key={i} className="zb-rip" data-zb-el={`rip${i}`} />)}
      {CURSORS.map((c) => (
        <div key={c.id} className="zb-cur" data-zb-el={`cur-${c.id}`} data-pose="arrow" style={{ ["--c" as string]: c.color }}>
          <div className="zb-glyph">
            <svg className="zb-arrow" viewBox="0 0 16 22" width="16" height="22"><path d="M1 1v16.2l4-3.8 2.9 6.6 2.5-1.1-2.9-6.5h5.7z" /></svg>
            <svg className="zb-beam" viewBox="0 0 16 22" width="16" height="22"><path d="M4 2h8M8 2v18M4 20h8" /></svg>
            <i className="zb-dot" />
          </div>
          <span className="zb-chip"><b>{c.name}</b> <em>{c.role}</em></span>
        </div>
      ))}
    </div>
    </>
  );
}
