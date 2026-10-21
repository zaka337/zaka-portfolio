/* Make the whole page crumble into falling letters (lib/knockOver.ts, page mode). Used by the
   secret terminal's `rm -rf /` and by asking the avatar out loud to "delete everything". The
   physics is loaded only now: nobody pays for it until they ask. */

export async function crumblePage() {
  try {
    const { knockOver, stopKnockOver } = await import("@/lib/knockOver");
    stopKnockOver();
    knockOver(
      document.body,
      {
        say: (text, ms) => window.dispatchEvent(new CustomEvent("zk-say", { detail: { text, ms } })),
        nod: () => window.dispatchEvent(new Event("zk-nod")),
      },
      { page: true },
    );
  } catch {
    // Never leave a half-built page behind
    document.documentElement.removeAttribute("data-crumble");
    document.querySelectorAll(".egg-layer, .egg-hint, .egg-tilt").forEach((n) => n.remove());
  }
}
