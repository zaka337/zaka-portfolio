"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { makeSelfie, cropRect, type Crop, type Selfie } from "./engine/selfie";

/* The face booth for MINI MAYHEM: take a selfie with the camera (or pick a photo), line it up, and
   it becomes your driver's face. The photo is turned into a cartoon right here in the browser and
   never leaves this device. Asking for the camera happens only when the button is pressed. */

type Step = "ask" | "live" | "adjust" | "blocked";
interface Raw { src: HTMLCanvasElement; w: number; h: number; mirror: boolean }

const MAX_SIDE = 1280;
const PREVIEW = 260;

export default function FaceBooth({ onUse, onClose }: { onUse: (s: Selfie) => void; onClose: () => void }) {
  const [step, setStep] = useState<Step>("ask");
  const [msg, setMsg] = useState("");
  const [crop, setCrop] = useState<Crop>({ zoom: 1.2, cx: 0.5, cy: 0.5, mirror: false });
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const raw = useRef<Raw | null>(null);
  const prev = useRef<HTMLCanvasElement>(null);
  const result = useRef<Selfie | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; id: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const stopCam = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => stopCam, [stopCam]);

  // Esc closes it; Tab stays inside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      else if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, [tabindex='0']")].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // the first button of each step has the focus
  useEffect(() => { panel.current?.querySelector<HTMLElement>("[data-first]")?.focus(); }, [step]);

  const startCam = async () => {
    setMsg("");
    if (!navigator.mediaDevices?.getUserMedia) { setMsg("This browser cannot open a camera here. You can pick a photo instead."); setStep("blocked"); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      setStep("live");
    } catch (e) {
      const n = (e as { name?: string }).name;
      setMsg(n === "NotAllowedError" || n === "SecurityError" ? "The camera is blocked for this site. You can allow it in the address bar, or pick a photo instead." : n === "NotFoundError" || n === "OverconstrainedError" ? "No camera was found. You can pick a photo instead." : "The camera could not start. You can pick a photo instead.");
      setStep("blocked");
    }
  };

  useEffect(() => {
    if (step !== "live" || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    video.current.play().catch(() => { /* the user can still press the button */ });
  }, [step]);

  const toAdjust = (r: Raw) => {
    raw.current = r;
    setCrop({ zoom: 1.2, cx: 0.5, cy: 0.5, mirror: r.mirror });
    setStep("adjust");
  };

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const k = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    stopCam();
    toAdjust({ src: c, w: c.width, h: c.height, mirror: true });
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(2, Math.round(im.naturalWidth * k)); c.height = Math.max(2, Math.round(im.naturalHeight * k));
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      stopCam();
      toAdjust({ src: c, w: c.width, h: c.height, mirror: false });
    };
    im.onerror = () => { URL.revokeObjectURL(url); setMsg("That file could not be opened as a picture. Try a JPG or PNG."); setStep("blocked"); };
    im.src = url;
  };

  // draw the cartoon whenever the crop changes
  useEffect(() => {
    const r = raw.current, cv = prev.current;
    if (step !== "adjust" || !r || !cv) return;
    const s = makeSelfie(r.src, r.w, r.h, crop);
    result.current = s;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(s.canvas, 0, 0, cv.width, cv.height);
  }, [step, crop]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ }
    drag.current = { x: e.clientX, y: e.clientY, cx: crop.cx, cy: crop.cy, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current, r = raw.current;
    if (!d || !r || d.id !== e.pointerId) return;
    const [, , side] = cropRect(r.w, r.h, crop);
    const rect = e.currentTarget.getBoundingClientRect();
    const k = side / rect.width;                                 // source pixels per screen pixel
    const dx = (e.clientX - d.x) * k * (r.mirror ? -1 : 1), dy = (e.clientY - d.y) * k;
    setCrop((c) => ({ ...c, cx: Math.min(1, Math.max(0, d.cx - dx / r.w)), cy: Math.min(1, Math.max(0, d.cy - dy / r.h)) }));
  };
  const onUp = () => { drag.current = null; };

  const use = () => { if (result.current) onUse(result.current); };

  return (
    <div className="mm-fb" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} className="mm-fb-panel" role="dialog" aria-modal="true" aria-label="Put your face on the driver">
        <h2>YOUR FACE, ON THE DRIVER</h2>

        {step === "ask" && (
          <>
            <p>Take a quick selfie and your driver gets your face, drawn as a cartoon. It happens in this tab only: <b>nothing is uploaded</b>, and it is forgotten when you close the tab.</p>
            <div className="mm-btns mm-fb-btns">
              <button type="button" className="mm-btn mm-btn-hero" data-first onClick={startCam}>USE CAMERA</button>
              <button type="button" className="mm-btn" onClick={() => document.getElementById("mm-fb-file")?.click()}>PICK A PHOTO</button>
              <button type="button" className="mm-btn mm-btn-ghost" onClick={onClose}>CANCEL</button>
            </div>
          </>
        )}

        {step === "live" && (
          <>
            <div className="mm-fb-cam">
              <video ref={video} playsInline muted autoPlay aria-label="Your camera" />
              <i className="mm-fb-oval" aria-hidden="true" />
            </div>
            <p>Face the camera in good light and fill the oval with your face.</p>
            <div className="mm-btns mm-fb-btns">
              <button type="button" className="mm-btn mm-btn-hero" data-first onClick={snap}>TAKE PHOTO</button>
              <button type="button" className="mm-btn mm-btn-ghost" onClick={() => { stopCam(); setStep("ask"); }}>BACK</button>
            </div>
          </>
        )}

        {step === "adjust" && (
          <>
            <canvas
              ref={prev}
              className="mm-fb-prev"
              width={PREVIEW} height={PREVIEW}
              aria-label="Your cartoon face. Drag to move the picture."
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            />
            <label className="mm-fb-zoom">
              <span>ZOOM</span>
              <input type="range" min={1} max={3} step={0.02} value={crop.zoom} onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))} aria-label="Zoom" />
            </label>
            <p>Drag the picture and zoom until your eyes, nose and mouth are in the middle.</p>
            <div className="mm-btns mm-fb-btns">
              <button type="button" className="mm-btn mm-btn-hero" data-first onClick={use}>USE THIS FACE</button>
              <button type="button" className="mm-btn" onClick={() => { setMsg(""); setStep("ask"); }}>RETAKE</button>
            </div>
          </>
        )}

        {step === "blocked" && (
          <>
            <p role="alert">{msg}</p>
            <div className="mm-btns mm-fb-btns">
              <button type="button" className="mm-btn mm-btn-hero" data-first onClick={() => document.getElementById("mm-fb-file")?.click()}>PICK A PHOTO</button>
              <button type="button" className="mm-btn" onClick={() => { setMsg(""); setStep("ask"); }}>TRY AGAIN</button>
              <button type="button" className="mm-btn mm-btn-ghost" onClick={onClose}>CANCEL</button>
            </div>
          </>
        )}

        <input id="mm-fb-file" type="file" accept="image/*" className="mm-sr" tabIndex={-1} onChange={pickFile} />
      </div>
    </div>
  );
}
