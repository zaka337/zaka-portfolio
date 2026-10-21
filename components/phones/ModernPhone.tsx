"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APPS, DOCK, HOME, app as appDef, type AppId, type Skin } from "@/lib/phoneOS";
import { AVAIL, clock } from "@/lib/availability";
import { play } from "@/lib/sound";
import AppView from "./PhoneApps";
import PhoneGlyph from "./PhoneGlyph";
import { useNow } from "./useNow";

/* One small working phone, in three looks (iPhone, Pixel, Nothing). It starts locked with a
   notification; tap to unlock, then open an app (it zooms or blooms out of its icon) and tap the
   bar at the bottom to go home. The looks are in phones.css; the apps are in PhoneApps.tsx.
   Nothing is drawn from a photo or uses a logo: the phones are made of CSS. */

const NAME: Record<Skin, string> = { iphone: "iPhone", pixel: "Pixel", nothing: "Nothing Phone" };

/* Words that find an app in the Pixel's search bar */
const WORDS: Record<AppId, string> = {
  mail: "mail email contact write message hello",
  whatsapp: "whatsapp chat message text",
  linkedin: "linkedin jobs hire work profile career",
  github: "github code repos open source",
  instagram: "instagram photos social",
  projects: "projects work portfolio case study built",
  resume: "resume cv download pdf experience",
  snake: "snake game play nokia",
  clock: "clock time zone world hours",
  book: "call book meeting schedule time hire availability",
  qa: "qa test bug challenge game quality",
};

const localTime = (d: Date) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d).replace(/\s?[AP]M$/i, "");

export default function ModernPhone({ skin, flipped = false }: { skin: Skin; flipped?: boolean }) {
  const now = useNow(1000);
  const [locked, setLocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [open, setOpen] = useState<AppId | null>(null);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 60 });
  const [notice, setNotice] = useState(false);
  const [q, setQ] = useState("");
  const screen = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // The lock screen gets a notification a moment after it appears
  useEffect(() => {
    if (!locked) { setNotice(false); return; }
    const id = window.setTimeout(() => setNotice(true), 1000);
    return () => window.clearTimeout(id);
  }, [locked]);

  const unlock = () => {
    if (!locked || unlocking) return;
    play("switch");
    setUnlocking(true);
    later(() => { setLocked(false); setUnlocking(false); }, 520);
  };
  const power = () => {
    if (locked) { unlock(); return; }
    play("switch");
    setOpen(null); setClosing(false); setQ(""); setLocked(true);
  };

  const openApp = (id: AppId, el: HTMLElement) => {
    const sc = screen.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (sc) setOrigin({ x: ((r.left + r.width / 2 - sc.left) / sc.width) * 100, y: ((r.top + r.height / 2 - sc.top) / sc.height) * 100 });
    play("tick");
    setQ("");
    setClosing(false);
    setOpen(id);
  };
  const goHome = () => {
    if (!open || closing) return;
    setClosing(true);
    later(() => { setOpen(null); setClosing(false); }, 340);
  };
  const nav = () => { if (open) goHome(); else if (locked) unlock(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { if (open) { e.preventDefault(); goHome(); } }
  };

  const time = now ? localTime(now) : "";
  const date = now ? new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(now) : "";
  const dateShort = now ? new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(now) : "";
  const there = now ? clock(now, AVAIL.tz) : "";
  const hits = q.trim() ? APPS.filter((a) => (a.label + " " + a.title + " " + WORDS[a.id]).toLowerCase().includes(q.trim().toLowerCase())) : [];

  const icon = (id: AppId, i: number, dock = false) => (
    <button
      key={id}
      type="button"
      className={`ph-icon${dock ? " is-dock" : ""}`}
      style={{ ["--i" as string]: i } as React.CSSProperties}
      aria-label={appDef(id).title}
      onClick={(e) => openApp(id, e.currentTarget)}
    >
      <span className="ph-ico"><PhoneGlyph id={id} /></span>
      {!dock && <span className="ph-lbl">{appDef(id).label}</span>}
    </button>
  );

  return (
    <div
      className="ph"
      data-skin={skin}
      data-locked={locked ? "1" : "0"}
      data-flip={flipped ? "1" : "0"}
      data-notice={notice ? "1" : "0"}
      data-app={open ?? ""}
      role="group"
      aria-label={`${NAME[skin]}, a small working phone. Tap the screen to unlock it.`}
      onKeyDown={onKeyDown}
    >
      <div className="ph-3d">
        <div className="ph-front">
          <span className="ph-sb ph-sb1" aria-hidden="true" />
          <span className="ph-sb ph-sb2" aria-hidden="true" />
          <button type="button" className="ph-sb ph-power" aria-label={locked ? "Power button: wake the screen" : "Power button: lock the phone"} onClick={power} />
          <div className="ph-body">
            <div className="ph-screen" ref={screen}>
              <div className="ph-wall" aria-hidden="true"><i /><i /><i /></div>

              <div className="ph-status" aria-hidden="true">
                <span className="ph-st-time">{time}</span>
                {skin === "iphone" && <span className="ph-island" />}
                {skin === "pixel" && <span className="ph-punch" />}
                <span className="ph-st-right">
                  <span className="ph-sig"><i /><i /><i /><i /></span>
                  <span className="ph-bat"><i /></span>
                </span>
              </div>

              {/* The home screen: a widget, the apps, and the dock */}
              {(!locked || unlocking) && (
                <div className="ph-home">
                  <div className="ph-widget">
                    {skin === "iphone" && (<><span className="ph-w-k">Zaka Ullah Waheed</span><b className="ph-w-t">Open for work</b><span className="ph-w-s"><i className="ph-pulse" />{AVAIL.place} {there}</span></>)}
                    {skin === "pixel" && (<><span className="ph-w-k">{dateShort}</span><b className="ph-w-t">{AVAIL.place} {there}</b><span className="ph-w-s">Open for work {'·'} Zaka Ullah Waheed</span></>)}
                    {skin === "nothing" && (<><b className="ph-dots">{now ? clock(now, Intl.DateTimeFormat().resolvedOptions().timeZone) : ""}</b><span className="ph-w-s"><i className="ph-red" />ZAKA {'·'} OPEN FOR WORK {'·'} {AVAIL.place.toUpperCase()} {there}</span></>)}
                  </div>
                  <div className="ph-grid">{HOME.map((id, i) => icon(id, i))}</div>
                  <div className="ph-dock">{DOCK.map((id, i) => icon(id, i + 7, true))}</div>
                  {skin === "pixel" && (
                    <div className="ph-searchwrap">
                      {hits.length > 0 && (
                        <ul className="ph-hits" aria-label="Search results">
                          {hits.slice(0, 4).map((a) => (
                            <li key={a.id}><button type="button" onClick={(e) => openApp(a.id, e.currentTarget)}><span className="ph-ico"><PhoneGlyph id={a.id} /></span>{a.title}</button></li>
                          ))}
                        </ul>
                      )}
                      <label className="ph-search">
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Zaka's portfolio" aria-label="Search Zaka's portfolio" />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* An open app, grown out of its icon */}
              {open && (
                <div className={`ph-app${closing ? " is-closing" : ""}`} style={{ ["--ox" as string]: `${origin.x}%`, ["--oy" as string]: `${origin.y}%` } as React.CSSProperties}>
                  <div className="ph-appbar">
                    <button type="button" className="ph-back-btn" onClick={goHome} aria-label="Back to the home screen">{skin === "pixel" ? "←" : "‹"}</button>
                    <h2>{appDef(open).title}</h2>
                  </div>
                  <div className="ph-appbody"><AppView id={open} skin={skin} /></div>
                </div>
              )}

              {/* The lock screen: the time, one notification, and a tap to unlock */}
              {locked && (
                <button type="button" className={`ph-lock${unlocking ? " is-unlocking" : ""}`} onClick={unlock} aria-label="Unlock the phone">
                  <span className={skin === "nothing" ? "ph-lock-t ph-dots" : "ph-lock-t"}>{skin === "nothing" ? (now ? clock(now, Intl.DateTimeFormat().resolvedOptions().timeZone) : "") : time}</span>
                  <span className="ph-lock-d">{date}</span>
                  {notice && (
                    <span className="ph-note-card">
                      <span className="ph-note-i"><PhoneGlyph id="whatsapp" /></span>
                      <span className="ph-note-b"><b>Zaka</b><span>Hey, thanks for stopping by. Tap to unlock and say hi.</span></span>
                      <span className="ph-note-n">now</span>
                    </span>
                  )}
                  <span className="ph-lock-h">{skin === "iphone" ? "Tap to unlock" : skin === "pixel" ? "Tap to unlock" : "TAP TO UNLOCK"}</span>
                </button>
              )}

              <button type="button" className="ph-nav" aria-label={open ? "Go home" : locked ? "Unlock" : "Home"} onClick={nav} tabIndex={-1} />
            </div>
          </div>
        </div>

        {skin === "nothing" && (
          <div className="ph-back" aria-hidden="true">
            <span className="ph-coil" /><span className="ph-lens ph-l1" /><span className="ph-lens ph-l2" />
            <span className="ph-glyph g1" /><span className="ph-glyph g2" /><span className="ph-glyph g3" /><span className="ph-glyph g4" /><span className="ph-glyph g5" />
            <span className="ph-back-t">(nothing)</span>
          </div>
        )}
      </div>

    </div>
  );
}
