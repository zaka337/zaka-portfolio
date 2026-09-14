// Singleton IntersectionObserver shared by all Reveal instances.
// One IO handles every entrance animation on the page — no per-component instances.

export const revealCallbacks = new WeakMap<Element, () => void>();
let sharedIO: IntersectionObserver | null = null;

export function getRevealIO(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!sharedIO) {
    sharedIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealCallbacks.get(entry.target)?.();
          sharedIO!.unobserve(entry.target);
          revealCallbacks.delete(entry.target);
        });
      },
      { threshold: 0.15 }
    );
  }
  return sharedIO;
}
