"use client";

import { useEffect } from "react";
import { found } from "@/lib/secrets";
import "./lamp.css";

/* Lamp mode: the page goes dark and only a soft circle of light around the pointer is lit, like
   reading by a lamp. The light follows the mouse; on a phone it follows a finger (held just above
   it, so the finger does not cover what it lights) and, when the finger is away, the phone's tilt,
   rolling like a ball. Dark paper is needed, so turning it on switches to dark mode, and going
   back to light mode (or Esc) switches it off.

   Turn it on with `lamp` in the secret terminal, by asking the avatar for the lamp, or by
   holding the theme button for a moment. It only lays a layer over the page: nothing of the
   page is changed, and the layer lets every tap and click through. */

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

function start(onExit: () => void) {
  const root = document.documentElement;
  // The lamp needs dark paper to work with
  if (root.getAttribute("data-theme") !== "dark") {
    (document.querySelector(".theme-toggle") as HTMLButtonElement | null)?.click();
  }

  const layer = document.createElement("div");
  layer.className = "lamp-layer";
  layer.setAttribute("aria-hidden", "true");
  const hint = document.createElement("div");
  hint.className = "lamp-hint";
  hint.textContent = "Lamp on · move to light the page · Esc to switch it off";
  document.body.append(layer, hint);
  root.setAttribute("data-lamp", "");
  found("lamp");

  let W = innerWidth, H = innerHeight;
  let tx = W / 2, ty = H * 0.42;       // where the light wants to be
  let x = tx, y = ty;                  // where it is (it glides)
  let lastTouch = -1e9;
  let raf = 0;
  let dead = false;
  let lastPainted = "";

  const paint = () => {
    const v = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    if (v === lastPainted) return;
    lastPainted = v;
    layer.style.setProperty("--lx", `${x.toFixed(1)}px`);
    layer.style.setProperty("--ly", `${y.toFixed(1)}px`);
  };
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dx = tx - x, dy = ty - y;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
    x += dx * 0.22;
    y += dy * 0.22;
    paint();
  };

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch") {
      lastTouch = performance.now();
      tx = e.clientX;
      ty = e.clientY - 70; // above the finger, so the finger does not hide what it lights
    } else {
      tx = e.clientX;
      ty = e.clientY;
    }
  };

  /* A phone's tilt moves the light when no finger is on the screen. The way gravity is reported
     differs between phones (iPhones report it upside down), so, as in the fallen letters, the
     direction is learnt from the first reading taken while the phone is held up. */
  let sign = 0;
  let neutralTilt: number | null = null;
  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null) return;
    if (!sign) {
      if (Math.abs(a.y) < 3) return;
      sign = a.y > 0 ? 1 : -1;
    }
    if (performance.now() - lastTouch < 1500) return; // a finger is in charge
    const gx = Math.max(-1, Math.min(1, (-sign * a.x) / 9.81));
    const gy = (sign * a.y) / 9.81;
    if (neutralTilt === null) neutralTilt = gy; // how the phone was first held
    const dy = Math.max(-1, Math.min(1, (gy - neutralTilt) * 2));
    tx = W / 2 + gx * W * 0.42;
    ty = H * 0.45 + dy * H * 0.4;
  };
  if (matchMedia("(hover: none)").matches && typeof DeviceMotionEvent !== "undefined") {
    const D = DeviceMotionEvent as MotionCtor;
    const attach = () => { if (!dead) window.addEventListener("devicemotion", onMotion); };
    // Called straight from the gesture that turned the lamp on, which iPhones need for the prompt
    if (typeof D.requestPermission === "function") D.requestPermission().then((r) => { if (r === "granted") attach(); }, () => {});
    else attach();
  }

  const onResize = () => { W = innerWidth; H = innerHeight; };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit(); };
  // Back to light mode: the lamp has nothing to do
  const mo = new MutationObserver(() => { if (root.getAttribute("data-theme") !== "dark") exit(); });

  function exit() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    mo.disconnect();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("pointerdown", onPointer);
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKey);
    layer.remove();
    hint.remove();
    root.removeAttribute("data-lamp");
    onExit();
  }

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKey);
  mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  paint();
  raf = requestAnimationFrame(frame);
  window.setTimeout(() => hint.classList.add("is-gone"), 3800);
  return exit;
}

export default function Lamp() {
  useEffect(() => {
    let stop: (() => void) | null = null;
    const set = (want?: boolean) => {
      const on = want ?? !stop;
      if (on && !stop) stop = start(() => { stop = null; });
      else if (!on && stop) { stop(); stop = null; }
    };
    const onEvent = (e: Event) => set((e as CustomEvent<boolean | undefined>).detail);
    window.addEventListener("zk-lamp", onEvent);
    return () => {
      window.removeEventListener("zk-lamp", onEvent);
      stop?.();
    };
  }, []);
  return null;
}
