"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPwa, setPwa } from "@/lib/pwa";
import "./pwa.css";

/* The installable, offline-capable side of the site.

   - Registers the service worker (public/sw.js, written by scripts/make-sw.mjs after each build) once the
     page has settled, so saving the site on the device never competes with the 3D head loading.
   - Holds on to the browser's install prompt and offers it ONCE, gently, after the copy is saved: a small
     bar at the bottom ("Saved for offline. Install this site as an app?"). It asks at most three times and
     never again after "not now". iPhones have no install prompt, so they get the Share > Add to Home Screen
     steps; other apps' built-in browsers (Instagram, LinkedIn...) cannot install anything and are told so.
   - Shows an "offline" bar while the connection is down, and "back online" when it returns.
   - `zk-install` (the search panel, the terminal and /tldr send it) asks to install right now.
   The state other components read lives in lib/pwa.ts. Nothing here runs in development, where a worker
   would only get in the way of hot reloading. */

type PromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Kind = "install" | "ios" | "inapp" | "hint" | "installed" | "already" | "offline" | "online";

const DISMISSED = "zk-pwa-dismissed";   // when "not now" was chosen (ms)
const SHOWN = "zk-pwa-shown";           // how many times the offer has been shown
const MONTH = 30 * 864e5;

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: it just asks again */ } },
};
const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: minimal-ui)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInApp = () => /FBAN|FBAV|Instagram|LinkedInApp|Line\/|Twitter|TikTok|Snapchat|Pinterest|; wv\)/i.test(navigator.userAgent);

const COPY: Record<Kind, { tag: string; text: string }> = {
  install: { tag: "SAVED FOR OFFLINE", text: "Install this site as an app?" },
  ios: { tag: "ADD TO HOME SCREEN", text: "Tap Share, then Add to Home Screen. It then opens with no connection." },
  inapp: { tag: "OPEN IN YOUR BROWSER", text: "This window cannot install apps. Open the menu, then choose Open in Safari or Chrome." },
  hint: { tag: "INSTALL", text: "Use your browser's menu: Install app, or Add to Home Screen." },
  installed: { tag: "INSTALLED", text: "Find it with your other apps. It works with no connection." },
  already: { tag: "ALREADY AN APP", text: "You are using the installed version." },
  offline: { tag: "OFFLINE", text: "Showing the saved copy. Sending a message needs a connection." },
  online: { tag: "BACK ONLINE", text: "" },
};

export default function PwaProvider() {
  const [bar, setBar] = useState<Kind | null>(null);
  const deferred = useRef<PromptEvent | null>(null);
  const timer = useRef(0);
  const barRef = useRef<Kind | null>(null);
  barRef.current = bar;

  const show = useCallback((kind: Kind, ms = 0) => {
    window.clearTimeout(timer.current);
    setBar(kind);
    if (ms) timer.current = window.setTimeout(() => setBar((b) => (b === kind ? null : b)), ms);
  }, []);
  const hide = useCallback(() => { window.clearTimeout(timer.current); setBar(null); }, []);

  // the install itself: the browser's prompt, or the steps for where it has none
  const install = useCallback(async () => {
    const s = getPwa();
    if (s.installed) { show("already", 3200); return; }
    const p = deferred.current;
    if (p) {
      hide();
      await p.prompt();
      const { outcome } = await p.userChoice;
      deferred.current = null;
      setPwa({ canInstall: false });
      if (outcome === "dismissed") store.set(DISMISSED, String(Date.now()));
      return;
    }
    if (s.inApp) show("inapp");          // checked first: an iPhone's Instagram or LinkedIn window cannot add to the Home Screen
    else if (s.ios) show("ios");
    else show("hint", 9000);
  }, [show, hide]);

  useEffect(() => {
    setPwa({ ios: isIos(), inApp: isInApp(), installed: isStandalone(), offline: !navigator.onLine });

    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e as PromptEvent; setPwa({ canInstall: true }); };
    const onInstalled = () => { deferred.current = null; setPwa({ installed: true, canInstall: false }); show("installed", 6000); };
    // Is the server reachable? The browser's own online/offline flag only flips when the network adapter
    // goes off, not when a server (or a captive Wi-Fi) is unreachable, so ask the server too (a HEAD
    // request is never touched by the service worker). While down, ask again every 8 seconds.
    let probing = false, again = 0;
    const refresh = async () => {
      if (probing) return;
      probing = true;
      let up = navigator.onLine;
      if (up) { try { await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" }); } catch { up = false; } }
      probing = false;
      const was = getPwa().offline;
      window.clearTimeout(again);
      if (!up) again = window.setTimeout(refresh, 8000);
      if (up === !was) return;
      setPwa({ offline: !up });
      if (!up) show("offline"); else if (barRef.current === "offline") show("online", 2400);
    };
    const onOffline = () => { void refresh(); };
    const onOnline = () => { void refresh(); };
    const onVisible = () => { if (!document.hidden) void refresh(); };
    const first = window.setTimeout(() => void refresh(), 1500);
    const mq = matchMedia("(display-mode: standalone)");
    const onMode = () => setPwa({ installed: isStandalone() });
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("zk-install", install);
    document.addEventListener("visibilitychange", onVisible);
    mq.addEventListener?.("change", onMode);
    if (!navigator.onLine) show("offline");

    // the service worker, once the page is done and the browser is idle
    let cancelled = false;
    const sw = navigator.serviceWorker;
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "zk-sw" && e.data.state === "ready") setPwa({ offlineReady: true });
    };
    if (sw && process.env.NODE_ENV === "production") {
      sw.addEventListener("message", onMessage);
      const go = () => {
        if (cancelled) return;
        sw.register("/sw.js", { scope: "/", updateViaCache: "none" })
          .then(() => sw.ready)
          .then((reg) => { if (!cancelled) reg.active?.postMessage({ type: "zk-sw-status" }); })
          .catch(() => { /* no worker: the site simply works online only */ });
      };
      const later = () => { if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(go, { timeout: 6000 }); else window.setTimeout(go, 2500); };
      if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("zk-install", install);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(first); window.clearTimeout(again);
      mq.removeEventListener?.("change", onMode);
      sw?.removeEventListener("message", onMessage);
      window.clearTimeout(timer.current);
    };
  }, [install, show]);

  // the one gentle offer: after the copy is saved and the browser can really install (or the person is on an iPhone)
  useEffect(() => {
    const check = () => {
      const s = getPwa();
      if (!s.offlineReady || s.installed || s.offline) return;
      if (!(s.canInstall || s.ios || s.inApp)) return;
      const dismissed = Number(store.get(DISMISSED) || 0);
      if (dismissed && Date.now() - dismissed < MONTH) return;
      if (Number(store.get(SHOWN) || 0) >= 3) return;
      if (barRef.current || document.hidden || document.documentElement.hasAttribute("data-mayhem")) return;
      store.set(SHOWN, String(Number(store.get(SHOWN) || 0) + 1));
      show(s.canInstall ? "install" : s.inApp ? "inapp" : "ios", 18000);
    };
    let t = 0;
    const on = () => { window.clearTimeout(t); t = window.setTimeout(check, 3500); };
    window.addEventListener("zk-pwa", on);
    on();
    return () => { window.removeEventListener("zk-pwa", on); window.clearTimeout(t); };
  }, [show]);

  if (!bar) return null;
  const c = COPY[bar];
  const live = bar === "offline" || bar === "online" || bar === "installed" || bar === "already";
  return (
    <div className={`pwa-bar is-${bar}`} role={live ? "status" : "region"} aria-label={live ? undefined : "Install this site"} aria-live={live ? "polite" : undefined}>
      <span className="pwa-tag">{c.tag}</span>
      {c.text && <span className="pwa-text">{c.text}</span>}
      {bar === "ios" && (
        <svg className="pwa-share" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M8 7l4-4 4 4M5 12v8h14v-8" />
        </svg>
      )}
      {bar === "install" && (
        <>
          <button type="button" className="pwa-btn is-main" onClick={() => void install()}>INSTALL</button>
          <button type="button" className="pwa-btn" onClick={() => { store.set(DISMISSED, String(Date.now())); hide(); }}>NOT NOW</button>
        </>
      )}
      {(bar === "ios" || bar === "inapp" || bar === "hint") && <button type="button" className="pwa-btn is-main" onClick={hide}>GOT IT</button>}
      {(bar === "installed" || bar === "already" || bar === "offline" || bar === "online") && (
        <button type="button" className="pwa-x" aria-label="Close" onClick={hide}>{'×'}</button>
      )}
    </div>
  );
}
