/* Ask the 3D head on the home page to do something (the terminal and the search panel use this).
   If we are already on the home page with the head showing, it just happens. Otherwise this takes
   the visitor home and leaves a note that the head picks up the moment it is ready
   (components/face/faceFx.ts, `attach`). Kept free of three.js so the places that call it stay small. */

export type FaceAct = "dissolve" | "reform" | "look" | "boop";

const KEY = "__zkFaceAsk";

export function faceAct(act: FaceAct, opts: { name?: string; goHome: () => void }) {
  const ready = window.location.pathname === "/" && !!document.querySelector(".avatar-scene[data-ready]");
  if (ready) {
    window.dispatchEvent(new CustomEvent("zk-face", { detail: { act, name: opts.name } }));
    return;
  }
  (window as unknown as Record<string, unknown>)[KEY] = { act, name: opts.name, at: Date.now() };
  if (window.location.pathname !== "/") opts.goHome();
}

/** The head calls this when it is ready: a request that is still fresh, or null */
export function takeFaceAsk(): { act: FaceAct; name?: string } | null {
  const w = window as unknown as Record<string, { act: FaceAct; name?: string; at: number } | undefined>;
  const a = w[KEY];
  w[KEY] = undefined;
  return a && Date.now() - a.at < 20000 ? { act: a.act, name: a.name } : null;
}
