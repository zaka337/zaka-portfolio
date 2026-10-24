"use client";

import { useEffect, useState } from "react";

/* What the rest of the site needs to know about the installable (offline) version of itself:
   components/PwaProvider.tsx keeps this up to date (it registers the service worker, catches the
   browser's install prompt and watches the connection) and announces every change with the
   `zk-pwa` event. Anything can ask for the install with `askInstall()` (the search panel, the
   terminal, the /tldr page). */

export interface PwaState {
  /** the service worker has saved a full copy of the site on this device */
  offlineReady: boolean;
  /** the browser has offered to install it and is waiting for us to ask */
  canInstall: boolean;
  /** it is running as an installed app right now (or was just installed) */
  installed: boolean;
  /** an iPhone or iPad: no install prompt exists, the person has to use Share > Add to Home Screen */
  ios: boolean;
  /** inside another app's browser (Instagram, LinkedIn...), where nothing can be installed */
  inApp: boolean;
  offline: boolean;
}

export const NO_PWA: PwaState = { offlineReady: false, canInstall: false, installed: false, ios: false, inApp: false, offline: false };

export function getPwa(): PwaState {
  if (typeof window === "undefined") return NO_PWA;
  return (window as unknown as { __zkPwa?: PwaState }).__zkPwa ?? NO_PWA;
}

export function setPwa(patch: Partial<PwaState>) {
  const next = { ...getPwa(), ...patch };
  (window as unknown as { __zkPwa?: PwaState }).__zkPwa = next;
  window.dispatchEvent(new CustomEvent("zk-pwa", { detail: next }));
}

/** Ask to install: the browser's own prompt where there is one, otherwise a short how-to */
export function askInstall() {
  window.dispatchEvent(new Event("zk-install"));
}

export function usePwa(): PwaState {
  const [s, setS] = useState<PwaState>(NO_PWA);
  useEffect(() => {
    setS(getPwa());
    const on = (e: Event) => setS((e as CustomEvent<PwaState>).detail);
    window.addEventListener("zk-pwa", on);
    return () => window.removeEventListener("zk-pwa", on);
  }, []);
  return s;
}
