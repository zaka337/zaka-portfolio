import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FaceSets, LM } from "@/lib/portrait/strokes";

/* The face tracker for "Get drawn". The same self-hosted model and wasm as the camera mirror (components/LookBack.tsx, public/mediapipe),
   loaded only when a visitor actually starts: nothing here runs, and nothing is downloaded, until then. */

export interface Tracker {
  sets: FaceSets;
  /** landmarks of the biggest face in a still picture (a canvas), or null */
  detectStill: (src: HTMLCanvasElement) => LM[] | null;
  /** landmarks of the biggest face in this video frame, or null (call about 15 times a second) */
  detectVideo: (v: HTMLVideoElement, now: number) => LM[] | null;
  close: () => void;
}

/* MediaPipe's engine can report anonymous usage to a Google address (odml.pa.googleapis.com). The site's Content-Security-Policy already
   stops that in production; this stops the attempt everywhere (development, a changed policy), so "nothing leaves your device" is true
   by construction. Only that one address is touched: every other request goes through as before. */
function blockTrackerTelemetry() {
  const w = window as unknown as { __zkNoLog?: boolean };
  if (w.__zkNoLog) return;
  w.__zkNoLog = true;
  const href = (u: unknown) => (typeof u === "string" ? u : u instanceof URL ? u.href : (u as Request | null)?.url ?? "");
  const bad = (u: unknown) => {
    try { const x = new URL(href(u), location.href); return x.hostname.endsWith("googleapis.com") && x.pathname.startsWith("/v1/log"); } catch { return false; }
  };
  const nativeFetch = window.fetch;
  window.fetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    return bad(input) ? Promise.reject(new TypeError("blocked")) : nativeFetch.call(window, input, init);
  } as typeof window.fetch;
  type X = XMLHttpRequest & { __zkBlock?: boolean };
  const xOpen = XMLHttpRequest.prototype.open, xSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: X, method: string, url: string | URL, ...rest: unknown[]) {
    this.__zkBlock = bad(url);
    return (xOpen as (...a: unknown[]) => void).call(this, method, this.__zkBlock ? "data:," : url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = function (this: X, body?: Document | XMLHttpRequestBodyInit | null) {
    if (this.__zkBlock) { window.setTimeout(() => this.dispatchEvent(new Event("error")), 0); return; }
    return xSend.call(this, body);
  };
  if (navigator.sendBeacon) {
    const beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (u: string | URL, d?: BodyInit | null) => (bad(u) ? false : beacon(u, d));
  }
}

export async function loadTracker(): Promise<Tracker> {
  blockTrackerTelemetry();
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const make = (delegate: "GPU" | "CPU") =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  // iPhones are steadier on the processor; elsewhere try the graphics chip first
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  let lmk: FaceLandmarker;
  let cpu = apple;
  try { lmk = await make(apple ? "CPU" : "GPU"); } catch { lmk = await make("CPU"); cpu = true; }

  const F = vision.FaceLandmarker;
  const sets: FaceSets = {
    lips: F.FACE_LANDMARKS_LIPS, leftEye: F.FACE_LANDMARKS_LEFT_EYE, rightEye: F.FACE_LANDMARKS_RIGHT_EYE,
    leftBrow: F.FACE_LANDMARKS_LEFT_EYEBROW, rightBrow: F.FACE_LANDMARKS_RIGHT_EYEBROW,
    leftIris: F.FACE_LANDMARKS_LEFT_IRIS, rightIris: F.FACE_LANDMARKS_RIGHT_IRIS, oval: F.FACE_LANDMARKS_FACE_OVAL,
  };
  let mode: "VIDEO" | "IMAGE" = "VIDEO";
  let closed = false;
  // a GPU tracker that fails on its first picture is replaced by a processor one, once
  const retryOnCpu = async () => { if (cpu || closed) throw new Error("tracker failed"); try { lmk.close(); } catch { /* gone */ } lmk = await make("CPU"); cpu = true; mode = "VIDEO"; };

  return {
    sets,
    detectStill: (src) => {
      if (closed) return null;
      if (mode !== "IMAGE") { void lmk.setOptions({ runningMode: "IMAGE" }); mode = "IMAGE"; }
      const r = lmk.detect(src);
      return r.faceLandmarks[0] ?? null;
    },
    detectVideo: (v, now) => {
      if (closed) return null;
      if (mode !== "VIDEO") { void lmk.setOptions({ runningMode: "VIDEO" }); mode = "VIDEO"; }
      try { return lmk.detectForVideo(v, now).faceLandmarks[0] ?? null; } catch { void retryOnCpu().catch(() => {}); return null; }
    },
    close: () => { closed = true; try { lmk.close(); } catch { /* already closed */ } },
  };
}

/** How good is this face for a portrait right now? Used to decide when to take the picture by itself. */
export function judgeFace(lm: LM[] | null): { ok: boolean; hint: string; x: number; y: number } {
  if (!lm || lm.length < 468) return { ok: false, hint: "Looking for your face...", x: 0, y: 0 };
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (const i of [234, 454, 10, 152]) { const p = lm[i]; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const nose = lm[4];
  const out = { x: nose.x, y: nose.y };
  if (h < 0.3) return { ok: false, hint: "A little closer.", ...out };
  if (h > 0.88 || w > 0.8) return { ok: false, hint: "A little further back.", ...out };
  if (Math.abs(cx - 0.5) > 0.2 || Math.abs(cy - 0.5) > 0.22) return { ok: false, hint: "Move into the middle.", ...out };
  // looking at the camera: the nose sits between the two cheeks
  const l = lm[234].x, r = lm[454].x, t = (nose.x - Math.min(l, r)) / Math.max(0.001, Math.abs(r - l));
  if (t < 0.3 || t > 0.7) return { ok: false, hint: "Look straight at the camera.", ...out };
  return { ok: true, hint: "Hold still.", ...out };
}
