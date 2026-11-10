/* Ask the home screen to play its multi-cursor build again (the hidden `rebuild` command in the terminal uses this).
   Already on the home page with the build mounted: it just happens. Otherwise this takes the visitor home and leaves a note
   that the build picks up the moment it is there (components/homebuild/HomeBuild.tsx). Kept tiny so the places that call it
   stay small. */

export function rebuildAct(opts: { goHome: () => void }) {
  if (window.location.pathname === "/" && document.querySelector(".zb-layer")) {
    window.dispatchEvent(new Event("zk-rebuild"));
    return;
  }
  (window as unknown as { __zkRebuild?: number }).__zkRebuild = Date.now();
  if (window.location.pathname !== "/") opts.goHome();
}
