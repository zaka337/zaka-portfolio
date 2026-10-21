"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { mirror, poseFromMatrix } from "@/lib/mirror";
import { found } from "@/lib/secrets";
import "./lookback.css";

/* Look back: the avatar copies the visitor's head. Run `camera` in the secret terminal (or press
   Shift+C), allow the camera, look at the screen for a second, then turn, nod and tilt.

   Everything happens on the visitor's own device: Google's MediaPipe face tracker runs in the
   browser, its engine and model are served from this site, and the picture is never recorded or
   uploaded. One thing to know: the library itself tries to send anonymous usage logs to Google
   (odml.pa.googleapis.com). The site's Content-Security-Policy (connect-src 'self', next.config.ts)
   blocks that request, so keep that header: removing it would let those logs out. The camera is
   visible the whole time
   (a small live preview and an off button), switches itself off when the visitor leaves the
   home page or the tab, and the tracker is only downloaded (about 6 MB over the network) when
   someone turns this on.

   The avatar has no face controls, only a movable head, so it copies head turns, nods and
   tilts, not expressions. How the tracker's numbers map to those angles is in lib/mirror.ts. */

type State = "off" | "asking" | "loading" | "centering" | "on" | "lost" | "error";

const CALIBRATE_MS = 900;
const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));

export default function LookBack() {
  const pathname = usePathname();
  const [state, setState] = useState<State>("off");
  const [msg, setMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const session = useRef<{ stop: () => void; recenter: () => void } | null>(null);

  const stop = useCallback(() => session.current?.stop(), []);

  const start = useCallback(async () => {
    if (session.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof WebAssembly === "undefined") {
      setState("error");
      setMsg("This browser cannot use the camera here.");
      window.setTimeout(() => setState((s) => (s === "error" ? "off" : s)), 7000);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: FaceLandmarker | null = null;
    let calibrating = true;
    let current: State = "off"; // what the screen is showing; "asking" below is then a real change

    const show = (next: State, note: string) => {
      if (current !== next || next === "error") setState(next);
      current = next;
      setMsg(note);
    };

    const finish = (next: State = "off", note = "") => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      try { landmarker?.close(); } catch { /* already closed */ }
      mirror.on = false;
      if (videoRef.current) videoRef.current.srcObject = null;
      if (session.current === mine) session.current = null;
      setState(next);
      setMsg(note);
      if (next === "error") window.setTimeout(() => setState((s) => (s === "error" ? "off" : s)), 7000);
    };

    const samples: { yaw: number; pitch: number; roll: number }[] = [];
    let calStart = 0;
    const mine = {
      stop: () => finish("off"),
      recenter: () => { calibrating = true; calStart = 0; samples.length = 0; show("centering", "Look at the screen..."); },
    };
    session.current = mine;

    show("asking", "Asking for the camera...");
    // Straight from the tap or key press: this is what lets the browser show its camera prompt
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      });
    } catch (e) {
      const name = (e as DOMException).name;
      finish("error", name === "NotAllowedError" ? "Camera blocked. Allow it in your browser, then try again."
        : name === "NotFoundError" ? "No camera found." : "The camera could not start.");
      return;
    }
    if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

    // The preview is drawn by React a moment after the tap; a fast "yes" from the browser can arrive first
    let video = videoRef.current;
    for (let i = 0; i < 60 && !video && !cancelled; i++) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      video = videoRef.current;
    }
    if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
    if (!video) { finish("error", "The camera could not start."); return; }
    video.srcObject = stream;
    video.muted = true;
    try { await video.play(); } catch { /* it starts when it can */ }

    show("loading", "Loading the face tracker (about 6 MB, once)...");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      if (cancelled) return;
      const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const make = (delegate: "GPU" | "CPU") =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
          outputFaceBlendshapes: false,
          minFaceDetectionConfidence: 0.4,
          minFacePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      // iPhones are steadier on the processor; elsewhere try the graphics chip first
      const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
      try { landmarker = await make(apple ? "CPU" : "GPU"); } catch { landmarker = await make("CPU"); }
    } catch {
      finish("error", "The face tracker could not load. Try again on a better connection.");
      return;
    }
    if (cancelled) { try { landmarker?.close(); } catch { /* gone */ } return; }

    show("centering", "Look at the screen...");
    let neutral = { yaw: 0, pitch: 0, roll: 0 };
    const eased = { yaw: 0, pitch: 0, roll: 0 };
    let lastSeen = performance.now();
    let lastFrame = -1;
    let lastRun = 0;

    const loop = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastRun < 30 || video.readyState < 2 || video.currentTime === lastFrame) return;
      lastRun = now;
      lastFrame = video.currentTime;

      let matrix: { data: ArrayLike<number> } | undefined;
      try { matrix = landmarker!.detectForVideo(video, now).facialTransformationMatrixes?.[0]; } catch { return; }
      if (!matrix) {
        if (now - lastSeen > 800 && mirror.on) {
          mirror.on = false;
          show("lost", "I cannot see your face. Move into the picture.");
        }
        return;
      }
      lastSeen = now;
      const p = poseFromMatrix(matrix.data);

      if (calibrating) {
        // The first second, looking at the screen, is "straight ahead": whatever angle the camera
        // sits at, that becomes the avatar's neutral
        if (!calStart) calStart = now;
        samples.push(p);
        if (now - calStart > CALIBRATE_MS && samples.length >= 5) {
          const n = samples.length;
          neutral = {
            yaw: samples.reduce((s, v) => s + v.yaw, 0) / n,
            pitch: samples.reduce((s, v) => s + v.pitch, 0) / n,
            roll: samples.reduce((s, v) => s + v.roll, 0) / n,
          };
          calibrating = false;
          samples.length = 0;
          eased.yaw = eased.pitch = eased.roll = 0;
        }
        return;
      }

      if (!mirror.on) {
        mirror.on = true;
        found("camera");
        show("on", "Turn, nod, tilt: I will copy you. It stays on this device.");
      }
      const k = 0.45;
      eased.yaw += (p.yaw - neutral.yaw - eased.yaw) * k;
      eased.pitch += (p.pitch - neutral.pitch - eased.pitch) * k;
      eased.roll += (p.roll - neutral.roll - eased.roll) * k;
      mirror.yaw = clamp(eased.yaw * 1.15, 1.0);   // a little more than you turn, so it reads from across a desk
      mirror.pitch = clamp(eased.pitch, 0.5);
      mirror.roll = clamp(eased.roll, 0.5);
    };
    raf = requestAnimationFrame(loop);
  }, []);

  /* Triggers: the terminal's `camera` command and Shift+C. Both run inside a key press, which is
     when browsers allow the camera prompt. */
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.code !== "KeyC" || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      if (session.current) session.current.stop(); else void startRef.current();
    };
    const onEvent = () => { if (!session.current) void startRef.current(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("zk-lookback", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("zk-lookback", onEvent);
    };
  }, []);

  // Off the moment it is no longer needed: leaving the home page (where the avatar is), hiding the
  // tab, Escape, or the page going away.
  useEffect(() => { if (pathname !== "/") stop(); }, [pathname, stop]);
  useEffect(() => {
    const onHide = () => { if (document.hidden) stop(); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") stop(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("keydown", onEsc);
    };
  }, [stop]);
  useEffect(() => () => stop(), [stop]);

  if (state === "off") return null;

  return (
    <div className={`lb-chip is-${state}`} role="status" aria-live="polite">
      <div className="lb-eye"><video ref={videoRef} playsInline muted aria-hidden="true" /></div>
      <div className="lb-text">
        <div className="lb-title"><span className="lb-dot" aria-hidden="true" />{state === "asking" || state === "error" ? "Camera" : "Camera on"}</div>
        <div className="lb-msg">{msg}</div>
      </div>
      <div className="lb-actions">
        {(state === "on" || state === "lost") && (
          <button type="button" className="lb-btn" onClick={() => session.current?.recenter()}>Recenter</button>
        )}
        <button type="button" className="lb-x" aria-label="Turn the camera off" onClick={stop}>{'×'}</button>
      </div>
    </div>
  );
}
