"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adsEnabled, askFirst, ADS_CLIENT, ADS_SCRIPT, ADS_SLOT } from "@/lib/ads";

/* The one ad space in the game area: on the title screen and on the results screen after a race, never while
   racing or choosing a driver. It does nothing at all until the ad settings exist (lib/ads.ts): no space is drawn
   and no script from another company is loaded.

   Before an ad script loads:
     - in the EU, EEA, UK and Switzerland (and when the country cannot be told) the visitor is asked first, once;
       "no thanks" is remembered and nothing is loaded;
     - everywhere else it loads straight away;
     - never for a visitor who is offline or has asked their device to save data.
   Ads from other companies mean third-party cookies: that is why the question is asked and why the privacy page
   (app/privacy) says so. If an ad is not filled the space closes up instead of leaving a hole. */

declare global { interface Window { adsbygoogle?: unknown[] } }

type Mode = "checking" | "ask" | "show" | "off";
const KEY = "zk-ads"; // the visitor's answer: "yes" or "no"
const REGION = "zk-region"; // this visit's country, so the question is not asked of the server twice

const read = (k: string, store: Storage | undefined) => { try { return store?.getItem(k) ?? null; } catch { return null; } };
const write = (k: string, v: string, store: Storage | undefined) => { try { store?.setItem(k, v); } catch { /* private mode: it asks again next time */ } };

function loadScript() {
  if (document.getElementById("zk-adsbygoogle")) return;
  const s = document.createElement("script");
  s.id = "zk-adsbygoogle";
  s.async = true;
  s.src = ADS_SCRIPT;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

function Slot({ where }: { where: "title" | "results" }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [status, setStatus] = useState("");
  const ins = useRef<HTMLModElement>(null);

  // Decide: show, ask, or stay away
  useEffect(() => {
    let dead = false;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (!navigator.onLine || nav.connection?.saveData) { setMode("off"); return; }
    const saved = read(KEY, localStorage);
    if (saved === "no") { setMode("off"); return; }
    if (saved === "yes") { setMode("show"); return; }
    const decide = (country: string) => { if (!dead) setMode(askFirst(country) ? "ask" : "show"); };
    const known = read(REGION, sessionStorage);
    if (known !== null) { decide(known); return; }
    fetch("/api/region", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { country?: string }) => { const c = String(d.country ?? ""); write(REGION, c, sessionStorage); decide(c); })
      .catch(() => decide(""));
    return () => { dead = true; };
  }, []);

  // Show: load the script once and ask for one ad; close the space if nothing fills it
  useEffect(() => {
    const el = ins.current;
    if (mode !== "show" || !el || el.dataset.zkPushed) return;
    el.dataset.zkPushed = "1";
    loadScript();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked by an ad blocker: the space closes below */ }
    const mo = new MutationObserver(() => setStatus(el.getAttribute("data-ad-status") ?? ""));
    mo.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => mo.disconnect();
  }, [mode]);

  if (mode === "checking" || mode === "off") return null;

  return (
    <aside className={`mm-ad mm-ad-${where}`} data-status={status} aria-label="Advertisement">
      {mode === "ask" ? (
        <div className="mm-ad-ask">
          <p>One small ad can show here to help pay for the project. It comes from Google and may use cookies. Allow it? <Link href="/privacy">Privacy</Link></p>
          <div className="mm-btns">
            <button type="button" className="mm-btn" onClick={() => { write(KEY, "yes", localStorage); setMode("show"); }}>ALLOW ADS</button>
            <button type="button" className="mm-btn mm-btn-ghost" onClick={() => { write(KEY, "no", localStorage); setMode("off"); }}>NO THANKS</button>
          </div>
        </div>
      ) : (
        <>
          <span className="mm-ad-label">ADVERTISEMENT</span>
          <ins
            ref={ins}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADS_CLIENT}
            data-ad-slot={ADS_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      )}
    </aside>
  );
}

export default function GameAd(props: { where: "title" | "results" }) {
  return adsEnabled ? <Slot {...props} /> : null;
}
