/* A timed glide to a page position, for the jump links on the Projects page (an index row, a rail dot, "Run it again").

   Only used for those jumps. The wheel, the keyboard, touch and the scrollbar are left entirely to the browser, which
   already scrolls smoothly on the compositor; taking the wheel over from script (moving the page from the main
   thread every frame) is slower and less smooth than that, and gets in the way of inner scrollers and zoom.
   Any wheel, touch, key or press stops the glide at once. Reduced motion: it simply jumps. */

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let cancel: (() => void) | null = null;

export function glideTo(y: number): void {
  cancel?.();
  const from = window.scrollY;
  // read once, here, at the click: never inside the frames
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const to = clamp(y, 0, max);
  const dist = Math.abs(to - from);
  if (dist < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo(0, to); return; }

  const ms = clamp(650 + dist * 0.16, 800, 1900);
  const t0 = performance.now();
  let raf = 0;
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

  const stop = () => {
    cancelAnimationFrame(raf);
    for (const e of events) window.removeEventListener(e, stop);
    if (cancel === stop) cancel = null;
  };
  const frame = (t: number) => {
    const p = clamp((t - t0) / ms, 0, 1);
    window.scrollTo(0, from + (to - from) * easeInOut(p));
    if (p < 1) raf = requestAnimationFrame(frame); else stop();
  };

  for (const e of events) window.addEventListener(e, stop, { passive: true });
  cancel = stop;
  raf = requestAnimationFrame(frame);
}
