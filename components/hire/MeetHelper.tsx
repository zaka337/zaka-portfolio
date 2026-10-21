"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AVAIL, ZONES, buildWeek, clock, clockLocal, dayLabel, isValidZone, localZone, makeIcs, offsetLabel, status, suggest,
  zakaWorking, type Day, type Slot,
} from "@/lib/availability";
import { saveDraft } from "@/lib/draft";
import { play } from "@/lib/sound";

/* The meeting helper. It shows Zaka's working hours in the visitor's own time zone, finds the
   half-hours when both of them are working, and turns the one they pick into a calendar file or a
   ready-written request. Nothing is booked: it is a request, and he confirms by email.
   Everything is worked out in the browser from the browser's own time-zone data (lib/availability.ts). */

const LEAD_MS = 2 * 3600000;
const HOURS_FROM = [6, 7, 8, 9, 10, 11, 12];
const HOURS_TO = [15, 16, 17, 18, 19, 20, 21, 22, 23];
const pad = (n: number) => String(n).padStart(2, "0");

/* Runs of cells that share a property, as [first, last + 1) positions on the 48-cell day */
function runs(day: Day, test: (c: Day["cells"][number]) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let from = -1;
  day.cells.forEach((c, i) => {
    if (test(c)) { if (from < 0) from = i; }
    else if (from >= 0) { out.push([from, i]); from = -1; }
  });
  if (from >= 0) out.push([from, 48]);
  return out;
}

export default function MeetHelper() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tz, setTz] = useState("UTC");
  const [detected, setDetected] = useState("UTC");
  const [hours, setHours] = useState({ from: 9 * 60, to: 18 * 60 });
  const [now, setNow] = useState(() => new Date());
  const [picked, setPicked] = useState<Slot | null>(null);
  const [readout, setReadout] = useState("");
  const [shake, setShake] = useState(-1);
  const [copied, setCopied] = useState(false);
  const stub = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const z = localZone();
    setDetected(z);
    setTz(z);
    setReady(true);
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const minute = Math.floor(now.getTime() / 60000);
  const week = useMemo(() => buildWeek(new Date(minute * 60000), tz, hours), [minute, tz, hours]);
  const slots = useMemo(() => suggest(week, new Date(minute * 60000), tz, hours), [week, minute, tz, hours]);
  const st = useMemo(() => status(new Date(minute * 60000)), [minute]);
  const zones = useMemo(() => (ZONES.includes(detected) ? ZONES : [detected, ...ZONES]).filter(isValidZone), [detected]);

  // Changing the zone or the hours can make a chosen time stop being a good one: start over
  useEffect(() => { setPicked(null); setReadout(""); }, [tz, hours]);

  const choose = (s: Slot) => {
    setPicked(s);
    play("tick");
    window.setTimeout(() => stub.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 80);
  };

  const pickOnBar = (dayIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(47, Math.floor(((e.clientX - r.left) / r.width) * 48)));
    const c = week[dayIdx].cells[i];
    if (c.zaka && c.t.getTime() >= now.getTime() + LEAD_MS) {
      choose({ start: c.t, end: new Date(c.t.getTime() + AVAIL.slot * 60000), outside: !c.you });
    } else {
      setShake(dayIdx * 100 + i);
      window.setTimeout(() => setShake(-1), 420);
      setReadout(c.zaka ? "That time is too soon to book. Pick one at least two hours from now." : "I am not working then. Pick a time inside the dark band.");
    }
  };
  const hoverBar = (dayIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(47, Math.floor(((e.clientX - r.left) / r.width) * 48)));
    const c = week[dayIdx].cells[i];
    const when = `${week[dayIdx].label}, ${clockLocal(c.t, tz)}`;
    setReadout(c.zaka ? `${when}: I am working${c.you ? " and you are in your usual hours" : ", but that is outside your usual hours"}.` : `${when}: I am not working (it is ${clock(c.t, AVAIL.tz)} in ${AVAIL.place}).`);
  };

  const when = (s: Slot) => `${dayLabel(s.start, tz)}, ${clockLocal(s.start, tz)} to ${clockLocal(s.end, tz)}`;
  const topic = "";
  const text = (s: Slot) =>
    `Hi Zaka, I'd like a 30 minute call on ${dayLabel(s.start, tz)} at ${clockLocal(s.start, tz)} my time (${tz}, ${offsetLabel(tz, s.start)}), which is ${clock(s.start, AVAIL.tz)} in ${AVAIL.place}.\n\nWhat I would like to talk about: `;

  const download = (s: Slot) => {
    const blob = new Blob([makeIcs(s, topic)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-with-zaka.ics";
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const request = (s: Slot) => {
    saveDraft({ from: "call request", message: text(s), timeline: "ASAP" });
    router.push("/contact-me");
  };
  const copy = async (s: Slot) => {
    try { await navigator.clipboard.writeText(text(s)); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { /* clipboard refused */ }
  };

  if (!ready) return <section className="mt" aria-busy="true"><div className="mt-intro"><p className="hr-label">BOOK A CALL</p></div></section>;

  const youWorking = (() => {
    const mins = Number(clock(now, tz).slice(0, 2)) * 60 + Number(clock(now, tz).slice(3, 5));
    return mins >= hours.from && mins < hours.to;
  })();
  const nightFor = (d: Date, z: string) => { const h = Number(clock(d, z).slice(0, 2)); return h < 6 || h >= 19; };

  return (
    <section className="mt" aria-labelledby="mt-title">
      <div className="mt-intro">
        <p className="hr-label">BOOK A CALL</p>
        <h2 id="mt-title" className="hr-h2">Find a time that works in your time zone.</h2>
        <p className="hr-lead">
          I work Monday to Friday, {pad(AVAIL.from / 60)}:00 to {pad(AVAIL.to / 60)}:00 in {AVAIL.place} (UTC+5). Below is that,
          translated into your day. Pick a half hour, and I will confirm it by email.
        </p>
      </div>

      <div className="mt-clocks">
        <div className="mt-clock">
          <span className="hr-micro">YOU {'·'} {tz.replace(/_/g, " ")} {'·'} {offsetLabel(tz, now)}</span>
          <span className="mt-time">{clock(now, tz, true)}</span>
          <span className={`mt-pill${youWorking ? " is-on" : ""}`}>{nightFor(now, tz) ? "Night" : "Day"} {'·'} {youWorking ? "in your usual hours" : "outside your usual hours"}</span>
        </div>
        <div className="mt-link" aria-hidden="true"><i /><i /><i /></div>
        <div className="mt-clock">
          <span className="hr-micro">ZAKA {'·'} {AVAIL.place} {'·'} UTC+5</span>
          <span className="mt-time">{clock(now, AVAIL.tz, true)}</span>
          <span className={`mt-pill${zakaWorking(now) ? " is-on" : ""}`}>
            {st.open ? "Working now" : st.next ? `Off now ${'·'} back ${dayLabel(st.next, tz)}, ${clockLocal(st.next, tz)} your time` : "Off now"}
          </span>
        </div>
      </div>

      <div className="mt-set">
        <label className="mt-field">
          <span className="hr-micro">YOUR TIME ZONE</span>
          <select value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")} ({offsetLabel(z, now)}){z === detected ? " - detected" : ""}</option>)}
          </select>
        </label>
        <label className="mt-field">
          <span className="hr-micro">YOUR DAY STARTS</span>
          <select value={hours.from} onChange={(e) => setHours((h) => ({ ...h, from: Number(e.target.value) }))}>
            {HOURS_FROM.map((h) => <option key={h} value={h * 60}>{pad(h)}:00</option>)}
          </select>
        </label>
        <label className="mt-field">
          <span className="hr-micro">AND ENDS</span>
          <select value={hours.to} onChange={(e) => setHours((h) => ({ ...h, to: Number(e.target.value) }))}>
            {HOURS_TO.map((h) => <option key={h} value={h * 60}>{pad(h)}:00</option>)}
          </select>
        </label>
      </div>

      <div className="mt-week" role="group" aria-label="The next seven days in your time zone">
        <div className="mt-key" aria-hidden="true">
          <span><i className="is-zaka" /> I am working</span>
          <span><i className="is-you" /> Your usual hours</span>
          <span><i className="is-both" /> Both: best times</span>
        </div>
        <div className="mt-axis" aria-hidden="true">
          {[0, 6, 12, 18, 24].map((h) => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{h === 24 ? "" : pad(h)}</span>)}
        </div>
        {week.map((day, di) => {
          const nowPct = day.today ? ((now.getTime() - day.cells[0].t.getTime()) / (48 * AVAIL.slot * 60000)) * 100 : -1;
          return (
            <div className="mt-day" key={day.label} style={{ ["--di" as string]: di } as React.CSSProperties}>
              <span className="mt-day-l">{day.label}</span>
              <div
                className="mt-bar"
                onPointerMove={(e) => hoverBar(di, e)}
                onPointerDown={(e) => pickOnBar(di, e)}
                onPointerLeave={() => setReadout("")}
              >
                {runs(day, (c) => c.you).map(([a, b]) => <i key={`y${a}`} className="mt-band is-you" style={{ left: `${(a / 48) * 100}%`, width: `${((b - a) / 48) * 100}%` }} />)}
                {runs(day, (c) => c.zaka).map(([a, b]) => <i key={`z${a}`} className="mt-band is-zaka" style={{ left: `${(a / 48) * 100}%`, width: `${((b - a) / 48) * 100}%` }} />)}
                {runs(day, (c) => c.zaka && c.you).map(([a, b]) => <i key={`b${a}`} className="mt-band is-both" style={{ left: `${(a / 48) * 100}%`, width: `${((b - a) / 48) * 100}%` }} />)}
                {day.today && nowPct >= 0 && nowPct <= 100 && <i className="mt-now" style={{ left: `${nowPct}%` }} />}
                {picked && day.cells.some((c) => c.t.getTime() === picked.start.getTime()) && (
                  <i className="mt-pick" style={{ left: `${(day.cells.findIndex((c) => c.t.getTime() === picked.start.getTime()) / 48) * 100}%` }} />
                )}
                {shake >= 0 && Math.floor(shake / 100) === di && <i className="mt-no" style={{ left: `${((shake % 100) / 48) * 100}%` }} />}
              </div>
            </div>
          );
        })}
        <p className="mt-readout" aria-live="polite">{readout || "Tap or click the bar to pick a time, or choose one of the suggestions below."}</p>
      </div>

      <div className="mt-slots">
        <p className="hr-micro">{slots.some((s) => s.outside) ? "NO OVERLAP IN YOUR USUAL HOURS THIS WEEK. THE CLOSEST TIMES:" : "THE BEST TIMES FOR BOTH OF US"}</p>
        {slots.length === 0 ? (
          <p className="hr-lead">Nothing free in the next week. Send me a message and we will find a time.</p>
        ) : (
          <div className="mt-cards">
            {slots.map((s, i) => (
              <button
                key={s.start.getTime()}
                type="button"
                className={`mt-card${picked && picked.start.getTime() === s.start.getTime() ? " is-picked" : ""}`}
                style={{ ["--i" as string]: i } as React.CSSProperties}
                aria-pressed={!!picked && picked.start.getTime() === s.start.getTime()}
                onClick={() => choose(s)}
              >
                <span className="mt-card-d">{dayLabel(s.start, tz)}</span>
                <span className="mt-card-t">{clockLocal(s.start, tz)}</span>
                <span className="mt-card-z">{clock(s.start, AVAIL.tz)} in {AVAIL.place}</span>
                <span className={`mt-card-chip${s.outside ? " is-out" : ""}`}>{s.outside ? "Outside your usual hours" : "Inside both days"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {picked && (
        <div className="mt-stub" ref={stub} aria-live="polite">
          <div className="mt-stub-main">
            <p className="hr-micro">YOUR CALL REQUEST</p>
            <h3 className="mt-stub-t">{when(picked)}</h3>
            <p className="hr-note">{tz.replace(/_/g, " ")} ({offsetLabel(tz, picked.start)}) {'·'} {clock(picked.start, AVAIL.tz)} in {AVAIL.place} {'·'} 30 minutes</p>
            <p className="hr-note">This is a request, not a booking: I confirm each call by email.</p>
          </div>
          <div className="mt-stub-cut" aria-hidden="true" />
          <div className="mt-stub-actions">
            <button type="button" className="hr-btn is-main" onClick={() => download(picked)}>Add to calendar</button>
            <button type="button" className="hr-btn" onClick={() => request(picked)}>Send this request</button>
            <button type="button" className="hr-btn" onClick={() => copy(picked)}>{copied ? "Copied" : "Copy the message"}</button>
          </div>
          <span className="mt-stamp" aria-hidden="true">REQUESTED</span>
        </div>
      )}
    </section>
  );
}
