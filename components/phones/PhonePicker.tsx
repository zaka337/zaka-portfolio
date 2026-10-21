"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NokiaPhone from "@/components/NokiaPhone";
import ModernPhone from "./ModernPhone";
import { PHONES, isPhoneId, type PhoneId } from "@/lib/phoneOS";
import { play } from "@/lib/sound";
import "./phones.css";

/* The phone on the contact page, and the way to swap it: the Nokia 3310 (the original), or a
   small working iPhone, Pixel or Nothing Phone. The choice is remembered on the visitor's device,
   and /contact#iphone (or #pixel, #nothing, #nokia) opens straight to one. Each phone is a little
   world of its own (components/phones/ModernPhone.tsx), with the same real ways to reach Zaka. */

const KEY = "zk-phone";

export default function PhonePicker() {
  const [phone, setPhone] = useState<PhoneId>("nokia");
  const [leaving, setLeaving] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const timer = useRef(0);
  const [ind, setInd] = useState({ x: 0, w: 0 });

  // The saved phone, or the one named in the address
  useEffect(() => {
    let want: PhoneId | null = null;
    const hash = window.location.hash.slice(1);
    if (isPhoneId(hash)) want = hash;
    else { try { const v = localStorage.getItem(KEY); if (isPhoneId(v)) want = v; } catch { /* storage refused */ } }
    if (want && want !== "nokia") setPhone(want);
    return () => window.clearTimeout(timer.current);
  }, []);

  const measure = useCallback(() => {
    const el = tabs.current[phone];
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [phone]);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const choose = (id: PhoneId) => {
    if (id === phone || leaving) return;
    play("tick");
    setLeaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setPhone(id);
      setFlipped(false);
      setLeaving(false);
    }, 240);
    try { localStorage.setItem(KEY, id); } catch { /* it still changes now */ }
    try { window.history.replaceState(null, "", `#${id}`); } catch { /* the address stays as it was */ }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const i = PHONES.findIndex((p) => p.id === phone);
    let n = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % PHONES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i + PHONES.length - 1) % PHONES.length;
    else return;
    e.preventDefault();
    choose(PHONES[n].id);
    tabs.current[PHONES[n].id]?.focus();
  };

  const hint = PHONES.find((p) => p.id === phone)!.hint;

  return (
    <>
      <div className="phs-tabs" role="radiogroup" aria-label="Choose a phone" onKeyDown={onKey}>
        <i className="phs-ind" aria-hidden="true" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />
        {PHONES.map((p) => (
          <button
            key={p.id}
            ref={(el) => { tabs.current[p.id] = el; }}
            type="button"
            role="radio"
            aria-checked={phone === p.id}
            tabIndex={phone === p.id ? 0 : -1}
            className="phs-tab"
            onClick={() => choose(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {phone === "nothing" && !leaving && (
        <button type="button" className="phs-flip" aria-pressed={flipped} onClick={() => { setFlipped((f) => !f); play("tick"); }}>
          {flipped ? "Show the front" : "Flip it over"}
        </button>
      )}

      <div className="contact-nokia-stage" style={{ flex: "1 1 0", minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className={`phs-slot${leaving ? " is-leaving" : ""}`}>
          {phone === "nokia" ? <NokiaPhone key="nokia" /> : <ModernPhone key={phone} skin={phone} flipped={flipped} />}
        </div>
      </div>
      <p className="nk-caption">{hint}</p>
    </>
  );
}
