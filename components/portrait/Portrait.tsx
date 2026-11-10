"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./portrait.css";
import { buildPortrait, type LM, type Portrait as PortraitData } from "@/lib/portrait/strokes";
import { CARD_H, CARD_W, cardBlob, portraitSrcs, saveBlob, shareBlob } from "@/lib/portrait/card";
import { SITE_URL } from "@/lib/site";
import { startDraw, type CursorId, type DrawHandle } from "./drawer";
import { judgeFace, loadTracker, type Tracker } from "./tracker";

/* "Get drawn": the visitor's face, drawn in ink by the five cursors from the home screen, then a card they can save or share.

   How it stays private: the camera (or the photo they pick) is read inside this page by the face tracker that already ships with the
   site (public/mediapipe). The picture is only used to find the face and its light and dark; the camera is switched off the moment the
   picture is taken; nothing is uploaded, stored or sent anywhere (the site's CSP would block it too). What is kept in memory is the
   list of ink strokes, until the sheet is closed.
   Opened by `portrait` in the terminal, the "Get drawn" action in Ctrl+K, or the address /?portrait (see PortraitLoader.tsx). */

type Phase = "closed" | "intro" | "starting" | "live" | "reading" | "drawing" | "done" | "error";

const CURSORS: Array<{ id: CursorId; name: string; role: string; color: string }> = [
  { id: "c1", name: "Next.js", role: "layout", color: "#ff9b6e" },
  { id: "c2", name: "React", role: "shading", color: "#8ec0ff" },
  { id: "c3", name: "TypeScript", role: "type", color: "#7ddfa8" },
  { id: "c4", name: "Three.js", role: "3D", color: "#c3a6ff" },
  { id: "c5", name: "CSS", role: "style", color: "#ffd36b" },
];

const TXT = {
  lede: "The five cursors from the home screen will draw your portrait in ink, live, in about eight seconds. Then it is yours: save it as a card, or share it.",
  fine: "Your camera (or the photo you choose) stays on this device. Nothing is uploaded or saved: the face tracker runs inside this page, and the picture is thrown away as soon as it is drawn.",
  noFace: "I could not find a face in that picture. Try one where the face is clear, well lit and facing the camera.",
  blocked: "The camera is blocked. Allow it from the camera icon in the address bar and try again. If no permission box ever appears, this browser cannot give a page the camera (an app's built-in browser, for example): open the page in Chrome or Safari, or choose a photo instead.",
  blockedInApp: "The camera is not available inside this app's browser (Instagram, LinkedIn, an editor's preview pane and the like). Open this page in Chrome or Safari to use the camera, or choose a photo instead.",
  noCamera: "No camera found. You can choose a photo instead.",
  camFail: "The camera could not start. You can choose a photo instead.",
  trackerFail: "The face tracker could not load. Try again on a better connection.",
  badFile: "That file could not be opened as a picture.",
};

const calmNow = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm");

/** read a picked file as a canvas no bigger than 960 px (EXIF rotation applied) */
async function fileToCanvas(file: File, mirror: boolean): Promise<HTMLCanvasElement> {
  let w = 0, h = 0, src: CanvasImageSource;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    w = bmp.width; h = bmp.height; src = bmp;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("bad image")); i.src = url; });
      w = im.naturalWidth; h = im.naturalHeight; src = im;
    } finally { URL.revokeObjectURL(url); }
  }
  const sc = Math.min(1, 960 / Math.max(w, h));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w * sc)); cv.height = Math.max(1, Math.round(h * sc));
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  if (mirror) { g.translate(cv.width, 0); g.scale(-1, 1); }
  g.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}

export default function PortraitSheet({ openOnMount }: { openOnMount?: boolean }) {
  const [phase, setPhase] = useState<Phase>(openOnMount ? "intro" : "closed");
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [canSnap, setCanSnap] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [portrait, setPortrait] = useState<PortraitData | null>(null);

  const run = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guidesRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGPathElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const curRefs = useRef<Partial<Record<CursorId, HTMLDivElement | null>>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<Tracker | null>(null);
  const handleRef = useRef<DrawHandle | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const rafRef = useRef(0);
  const snapRef = useRef<() => void>(() => {});
  const liveLm = useRef<LM[] | null>(null);
  const backRef = useRef<Element | null>(null);
  const nameRef = useRef("");
  nameRef.current = name;

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) { try { v.pause(); } catch { /* not playing */ } v.srcObject = null; }
  }, []);

  const reset = useCallback(() => {
    run.current++;
    stopCamera();
    trackerRef.current?.close(); trackerRef.current = null;
    handleRef.current?.destroy(); handleRef.current = null;
    blobRef.current = null; liveLm.current = null;
    setPortrait(null); setCanSnap(false);
  }, [stopCamera]);

  const close = useCallback(() => {
    reset();
    setPhase("closed");
    (backRef.current as HTMLElement | null)?.focus?.();
  }, [reset]);

  const fail = useCallback((message: string) => {
    stopCamera();
    trackerRef.current?.close(); trackerRef.current = null;
    setErr(message); setPhase("error");
  }, [stopCamera]);

  /* open: from the terminal, the palette, or the address */
  useEffect(() => {
    const open = () => {
      backRef.current = document.activeElement;
      reset(); setErr(""); setNote(""); setHint("");
      setPhase("intro");
    };
    window.addEventListener("zk-portrait", open);
    if (openOnMount) open();
    return () => { window.removeEventListener("zk-portrait", open); reset(); };
  }, [openOnMount, reset]);

  // Escape closes it from anywhere (keys inside the sheet are handled by the sheet itself; this catches focus that has dropped to the page)
  useEffect(() => {
    if (phase === "closed") return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [phase, close]);

  // the camera is never left on if the page is hidden or left
  useEffect(() => {
    const onHide = () => { if (document.hidden && (phase === "starting" || phase === "live")) { reset(); setPhase("intro"); } };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase, reset]);

  useEffect(() => {
    if (phase === "closed") return;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try { setCanShare(!!nav.share && !!nav.canShare?.({ files: [new File([""], "x.png", { type: "image/png" })] })); } catch { setCanShare(false); }
    // focus the first useful control when the sheet opens
    if (phase === "intro") window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>("[data-first]")?.focus(), 30);
  }, [phase]);

  /* ---- from landmarks to the drawing ---- */
  const makeAndDraw = useCallback(async (cv: HTMLCanvasElement, lm: LM[], tracker: Tracker, id: number) => {
    setPhase("reading");
    await new Promise((r) => window.setTimeout(r, 90)); // let "reading" paint before the heavy part
    if (run.current !== id) return;
    const data = cv.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, cv.width, cv.height);
    let p: PortraitData | null = null;
    try { p = buildPortrait(lm, data, tracker.sets, 7); } catch (e) { console.error("portrait", e); }
    cv.width = 1; cv.height = 1; // the picture is no longer needed: let go of it
    tracker.close(); if (trackerRef.current === tracker) trackerRef.current = null;
    if (run.current !== id) return;
    if (!p) { fail(TXT.noFace); return; }
    setPortrait(p);
    setPhase("drawing");
  }, [fail]);

  /* ---- the camera ---- */
  const useCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof WebAssembly === "undefined") { fail(TXT.noCamera); return; }
    reset();
    const id = run.current;
    setErr(""); setNote(""); setHint("Asking for the camera..."); setPhase("starting");
    const trackerP = loadTracker(); // downloads while the browser asks for permission
    trackerP.catch(() => {});
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    } catch (e) {
      if (run.current !== id) return;
      const n = (e as DOMException).name;
      // an app's own browser (Instagram, LinkedIn, an Electron preview pane) refuses the camera and offers no way to allow it: say so
      const inApp = /FBAN|FBAV|Instagram|LinkedInApp|Snapchat|TikTok|musical_ly|Twitter|MicroMessenger|Electron\//i.test(navigator.userAgent);
      fail(n === "NotAllowedError" || n === "SecurityError" ? (inApp ? TXT.blockedInApp : TXT.blocked) : n === "NotFoundError" || n === "OverconstrainedError" ? TXT.noCamera : TXT.camFail);
      return;
    }
    if (run.current !== id) { stream.getTracks().forEach((t) => t.stop()); return; }
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) { fail(TXT.camFail); return; }
    video.srcObject = stream; video.muted = true;
    try { await video.play(); } catch { /* it starts when it can */ }
    setHint("Loading the face tracker (about 6 MB, once)...");
    let tracker: Tracker;
    try { tracker = await trackerP; } catch { if (run.current === id) fail(TXT.trackerFail); return; }
    if (run.current !== id) { tracker.close(); return; }
    trackerRef.current = tracker;
    setPhase("live"); setHint("Looking for your face..."); setCanSnap(false);

    let lastRun = 0, hold = 0, lastNose: [number, number] | null = null, shownHint = "", snap = false;
    const HOLD_MS = 1100;
    const setRing = (f: number) => { ringRef.current?.style.setProperty("stroke-dashoffset", String(1 - Math.max(0, Math.min(1, f)))); };

    const capture = async () => {
      if (run.current !== id) return;
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      cancelAnimationFrame(rafRef.current);
      const live = liveLm.current;
      const sc = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(v.videoWidth * sc); cv.height = Math.round(v.videoHeight * sc);
      const g = cv.getContext("2d", { willReadFrequently: true })!;
      g.translate(cv.width, 0); g.scale(-1, 1); // the picture the visitor just watched: a mirror
      g.drawImage(v, 0, 0, cv.width, cv.height);
      stopCamera(); // the camera light goes off now, before anything is computed
      setPhase("reading");
      await new Promise((r) => window.setTimeout(r, 60));
      if (run.current !== id) return;
      let lm: LM[] | null = null;
      try { lm = tracker.detectStill(cv); } catch { lm = null; }
      if (!lm && live) lm = live.map((q) => ({ ...q, x: 1 - q.x })); // the live ones are in the un-mirrored frame
      if (!lm) { fail(TXT.noFace); return; }
      await makeAndDraw(cv, lm, tracker, id);
    };
    snapRef.current = () => { snap = true; };

    const tick = () => {
      if (run.current !== id) return;
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      if (snap) { snap = false; void capture(); return; }
      if (now - lastRun < 66 || video.readyState < 2) return;
      const dt = lastRun ? now - lastRun : 66;
      lastRun = now;
      const lm = tracker.detectVideo(video, now);
      liveLm.current = lm;
      const j = judgeFace(lm);
      const moved = lastNose && j.ok ? Math.hypot(j.x - lastNose[0], j.y - lastNose[1]) : 1;
      lastNose = lm ? [j.x, j.y] : null;
      if (j.ok && moved < 0.014) hold += dt; else hold = Math.max(0, hold - dt * 2);
      setRing(hold / HOLD_MS);
      const msg = j.hint;
      if (msg !== shownHint) { shownHint = msg; setHint(msg); }
      setCanSnap((c) => (c === !!lm ? c : !!lm));
      if (hold >= HOLD_MS) void capture();
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [fail, makeAndDraw, reset, stopCamera]);

  /* ---- a photo instead ---- */
  const usePhoto = useCallback(async (file: File) => {
    reset();
    const id = run.current;
    setErr(""); setNote(""); setHint("Reading your picture..."); setPhase("reading");
    let cv: HTMLCanvasElement;
    try { cv = await fileToCanvas(file, false); } catch { if (run.current === id) fail(TXT.badFile); return; }
    if (run.current !== id) return;
    let tracker: Tracker;
    try { tracker = await loadTracker(); } catch { if (run.current === id) fail(TXT.trackerFail); return; }
    if (run.current !== id) { tracker.close(); return; }
    trackerRef.current = tracker;
    let lm: LM[] | null = null;
    try { lm = tracker.detectStill(cv); } catch { lm = null; }
    if (!lm) { fail(TXT.noFace); return; }
    await makeAndDraw(cv, lm, tracker, id);
  }, [fail, makeAndDraw, reset]);

  /* ---- the cursors draw ---- */
  useEffect(() => {
    if (phase !== "drawing" || !portrait) return;
    const canvas = canvasRef.current, guides = guidesRef.current, stage = stageRef.current;
    const cursors = {} as Record<CursorId, HTMLElement>;
    for (const c of CURSORS) { const el = curRefs.current[c.id]; if (el) cursors[c.id] = el; }
    if (!canvas || !guides || !stage || Object.keys(cursors).length < 5) return;
    const id = run.current;
    const calm = calmNow();
    const lite = window.matchMedia("(max-width: 768px)").matches;
    const q = new URLSearchParams(location.search);
    const seek = q.has("zpt") ? Number(q.get("zpt")) : undefined;
    const h = startDraw({
      canvas, guides, stage, cursors, portrait, name: nameRef.current, lite, speed: q.has("zpspeed") ? Number(q.get("zpspeed")) : undefined,
      seek: calm ? 99 : seek,
      onDone: () => { if (run.current === id) setPhase("done"); },
    });
    handleRef.current = h;
    (window as unknown as { __zp?: DrawHandle }).__zp = h;
    if (calm) setPhase("done");
    return () => h.destroy();
  }, [phase, portrait]);

  /* the card, rendered once the drawing is finished, so Save and Share are instant */
  useEffect(() => {
    if (phase !== "done" || !portrait) return;
    let live = true;
    void cardBlob(portraitSrcs(portrait), { name: nameRef.current }).then((b) => { if (live) blobRef.current = b; });
    return () => { live = false; };
  }, [phase, portrait]);

  const save = useCallback(async () => {
    if (!portrait) return;
    const b = blobRef.current ?? (await cardBlob(portraitSrcs(portrait), { name: nameRef.current }));
    if (!b) return;
    saveBlob(b);
    setNote("Saved to your downloads.");
  }, [portrait]);
  const share = useCallback(async () => {
    if (!portrait) return;
    const b = blobRef.current ?? (await cardBlob(portraitSrcs(portrait), { name: nameRef.current }));
    if (!b) return;
    const shared = await shareBlob(b, `I got drawn in ink by five cursors: ${SITE_URL}/?portrait`);
    if (!shared) { saveBlob(b); setNote("Saved to your downloads."); }
  }, [portrait]);

  const again = useCallback(() => { reset(); setNote(""); setErr(""); setPhase("intro"); }, [reset]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // the site's own shortcuts (terminal, x-ray, search...) stay quiet while this is open
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if ((e.key === " " || e.key === "Enter") && phase === "drawing" && (e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); handleRef.current?.skip(); return; }
    if (e.key === "Tab") {
      const f = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input, [href]") ?? []).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  if (phase === "closed") return null;
  const showStage = phase === "drawing" || phase === "done";
  const camOn = phase === "starting" || phase === "live";
  const status = phase === "reading" ? "Reading your face" : phase === "drawing" ? "Drawing" : phase === "done" ? "Your portrait is ready" : hint;

  return (
    <div ref={rootRef} className="zp" role="dialog" aria-modal="true" aria-labelledby="zp-title" tabIndex={-1} onKeyDown={onKeyDown}>
      <button type="button" className="zp-x" aria-label="Close" onClick={close}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
      </button>
      <div className="zp-sr" role="status" aria-live="polite">{status}</div>

      {phase === "intro" && (
        <div className="zp-body">
          <p className="zp-eyebrow">five cursors, one pen</p>
          <h2 id="zp-title" className="zp-title">Get drawn.</h2>
          <p className="zp-lede">{TXT.lede}</p>
          <label className="zp-name">
            Name on the card (optional)
            <input type="text" value={name} maxLength={24} autoComplete="off" spellCheck={false} placeholder="Your name" onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="zp-actions">
            <button type="button" className="zp-btn" data-primary data-first onClick={() => void useCamera()}>Use my camera</button>
            <button type="button" className="zp-btn" onClick={() => fileRef.current?.click()}>Choose a photo</button>
          </div>
          <p className="zp-fine"><b>Private.</b> {TXT.fine}</p>
        </div>
      )}
      {phase !== "intro" && !showStage && !camOn && phase !== "error" && (
        <div className="zp-body zp-wait">
          <h2 id="zp-title" className="zp-title" style={{ fontSize: "clamp(32px,6vw,52px)" }}>Reading your face</h2>
          <div className="zp-dots" aria-hidden="true"><i /><i /><i /></div>
        </div>
      )}
      {phase === "error" && (
        <div className="zp-body">
          <h2 id="zp-title" className="zp-title" style={{ fontSize: "clamp(32px,6vw,52px)" }}>Hm.</h2>
          <p className="zp-err">{err}</p>
          <div className="zp-actions">
            <button type="button" className="zp-btn" data-primary data-first onClick={() => void useCamera()}>Try the camera</button>
            <button type="button" className="zp-btn" onClick={() => fileRef.current?.click()}>Choose a photo</button>
            <button type="button" className="zp-btn" onClick={close}>Close</button>
          </div>
        </div>
      )}

      {/* the camera preview: always mounted so the video element exists the moment the browser says yes */}
      <div className="zp-body" hidden={!camOn}>
        <h2 id={camOn ? "zp-title" : undefined} className="zp-sr">Camera preview</h2>
        <div className="zp-cam">
          <video ref={videoRef} playsInline muted aria-label="Your camera, mirrored" />
          <svg viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true">
            <defs><mask id="zp-hole"><rect width="100" height="125" fill="#fff" /><ellipse cx="50" cy="58" rx="27" ry="35" fill="#000" /></mask></defs>
            <rect className="zp-cam-shade" width="100" height="125" mask="url(#zp-hole)" />
            <ellipse className="zp-ring-bg" cx="50" cy="58" rx="27" ry="35" />
            <path ref={ringRef} className="zp-ring" d="M50 23 A27 35 0 0 1 50 93 A27 35 0 0 1 50 23" pathLength={1} />
          </svg>
        </div>
        <p className="zp-hint">{hint}</p>
        <div className="zp-actions">
          <button type="button" className="zp-btn" data-primary data-first disabled={!canSnap || phase !== "live"} onClick={() => snapRef.current()}>Take it now</button>
          <button type="button" className="zp-btn" onClick={() => fileRef.current?.click()}>Choose a photo</button>
        </div>
      </div>

      {/* the stage: always mounted too (the cursors and canvases need to exist before the drawing starts) */}
      <div className="zp-stage-wrap" hidden={!showStage}>
        <h2 id={showStage ? "zp-title" : undefined} className="zp-sr">Your portrait in ink</h2>
        <div ref={stageRef} className="zp-stage" data-drawing={phase === "drawing" ? "" : undefined} onClick={() => { if (phase === "drawing") handleRef.current?.skip(); }}>
          <canvas ref={canvasRef} width={CARD_W} height={CARD_H} role="img" aria-label="An ink portrait of you, drawn from your picture" />
          <canvas ref={guidesRef} className="zp-guides" width={CARD_W} height={CARD_H} aria-hidden="true" />
          {CURSORS.map((c) => (
            <div key={c.id} ref={(el) => { curRefs.current[c.id] = el; }} className="zp-cur" data-pose="arrow" aria-hidden="true" style={{ ["--c" as string]: c.color }}>
              <div className="zp-glyph">
                <svg className="zp-arrow" viewBox="0 0 16 22" width="16" height="22"><path d="M1 1v16.2l4-3.8 2.9 6.6 2.5-1.1-2.9-6.5h5.7z" /></svg>
                <svg className="zp-beam" viewBox="0 0 16 22" width="16" height="22"><path d="M4 2h8M8 2v18M4 20h8" /></svg>
                <i className="zp-dot" />
              </div>
              <span className="zp-chip"><b>{c.name}</b> <em>{c.role}</em></span>
            </div>
          ))}
        </div>
        {phase === "done" ? (
          <>
            <div className="zp-actions">
              <button type="button" className="zp-btn" data-primary data-first onClick={() => void save()}>Save the card</button>
              {canShare && <button type="button" className="zp-btn" onClick={() => void share()}>Share</button>}
              <button type="button" className="zp-btn" onClick={again}>Draw again</button>
              <button type="button" className="zp-btn" onClick={close}>Close</button>
            </div>
            <p className="zp-note">{note || "Nothing was uploaded. It only exists in this tab."}</p>
          </>
        ) : (
          <p className="zp-note">Tap the card to skip ahead.</p>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void usePhoto(f); }} />
    </div>
  );
}
