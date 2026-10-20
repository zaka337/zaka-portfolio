"use client";

import { useEffect } from "react";

/* A small on-screen log for a phone, where there is no console: open the home page with
   ?egg-debug on the end of the address, tap the title and read what the browser did.
   Without that parameter this component does nothing at all. */

const VERSION = "egg-debug 1";

export default function EggDebug() {
  useEffect(() => {
    if (!/[?&]egg-debug(?:[=&]|$)/.test(window.location.search)) return;

    const box = document.createElement("pre");
    box.setAttribute("aria-hidden", "true");
    box.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:100000;margin:0;padding:6px 8px;" +
      "max-height:55dvh;overflow:hidden;background:rgba(0,0,0,.88);color:#9f9;" +
      "font:10px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all;pointer-events:none";
    document.body.appendChild(box);

    const t0 = performance.now();
    const lines: string[] = [];
    const log = (s: string) => {
      lines.push(`${((performance.now() - t0) / 1000).toFixed(2)}s ${s}`);
      if (lines.length > 34) lines.shift();
      box.textContent = lines.join("\n");
    };
    const who = (t: EventTarget | null) => {
      const e = t as Element | null;
      if (!e || !e.tagName) return String(t);
      const c = typeof e.className === "string" ? e.className.trim().split(/\s+/)[0] : "";
      return e.tagName.toLowerCase() + (c ? "." + c : "");
    };

    // What the phone is
    const ua = navigator.userAgent.match(/(?:iPhone )?OS [\d_]+|Android [\d.]+|Chrome\/[\d.]+/);
    const block = document.querySelector<HTMLElement>(".block-tl");
    const title = document.querySelector<HTMLElement>(".title-huge");
    let canvas2d = "?";
    try { canvas2d = document.createElement("canvas").getContext("2d") ? "ok" : "MISSING"; } catch { canvas2d = "error"; }
    log(VERSION);
    log(`${ua ? ua[0] : "unknown device"} | ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`);
    log(
      `reduce-motion:${window.matchMedia("(prefers-reduced-motion: reduce)").matches} ` +
      `touch:${window.matchMedia("(hover: none)").matches} canvas2d:${canvas2d} ` +
      `onclick:${block ? typeof block.onclick : "no title block"}`,
    );
    if (title) {
      const r = title.getBoundingClientRect();
      log(`title ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} top-element:${who(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))}`);
    }
    log("now tap the ZAKA title");

    // What happens, in order
    const onPtr = (e: Event) => {
      const p = e as PointerEvent;
      log(`${e.type}${p.pointerType ? " " + p.pointerType : ""} on ${who(e.target)} @${Math.round(p.clientX ?? 0)},${Math.round(p.clientY ?? 0)}`);
    };
    const onTouch = (e: Event) => log(`${e.type} on ${who(e.target)}`);
    const onClick = (e: Event) => log(`click on ${who(e.target)}`);
    const onResize = () => log(`RESIZE ${window.innerWidth}x${window.innerHeight}`);
    const onScroll = () => log(`scroll y=${Math.round(window.scrollY)}`);
    const onVis = () => log(`visibility ${document.visibilityState}`);
    const onErr = (e: ErrorEvent) => log(`ERROR ${e.message}`);
    const onRej = (e: PromiseRejectionEvent) => log(`REJECTED ${String(e.reason).slice(0, 120)}`);
    const onEgg = (e: Event) => {
      const d = (e as CustomEvent<{ stage: string; info: string }>).detail;
      log(`>>> egg ${d.stage}${d.info ? ": " + d.info : ""}`);
    };

    const opts = { capture: true, passive: true } as const;
    const ptr = ["pointerdown", "pointerup", "pointercancel"];
    const touch = ["touchstart", "touchend", "touchcancel"];
    ptr.forEach((n) => window.addEventListener(n, onPtr, opts));
    touch.forEach((n) => window.addEventListener(n, onTouch, opts));
    window.addEventListener("click", onClick, opts);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    window.addEventListener("zk-egg", onEgg);

    // Is the phone keeping up?
    let frames = 0;
    let raf = 0;
    const start = performance.now();
    const count = (now: number) => {
      frames++;
      if (now - start < 1500) raf = requestAnimationFrame(count);
      else log(`frame rate about ${Math.round(frames / ((now - start) / 1000))} fps`);
    };
    raf = requestAnimationFrame(count);

    return () => {
      cancelAnimationFrame(raf);
      ptr.forEach((n) => window.removeEventListener(n, onPtr, opts));
      touch.forEach((n) => window.removeEventListener(n, onTouch, opts));
      window.removeEventListener("click", onClick, opts);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      window.removeEventListener("zk-egg", onEgg);
      box.remove();
    };
  }, []);

  return null;
}
