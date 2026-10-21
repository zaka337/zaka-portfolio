"use client";

import { useEffect, useState } from "react";

/* Sleeping in Islamabad. The site knows what time it is where Zaka lives, so at night it says he
   is asleep and the avatar nods off (head down, a little ZZZ). A tap wakes him up, grumpy, and he
   stays awake for the rest of that visit. Nothing about the visitor is looked at: it is only the
   clock in Islamabad, and it changes nothing about how to reach him.

   The night is the hours below, in Pakistan time. Change them here. */
const TZ = "Asia/Karachi";
const NIGHT_FROM = 0;  // from midnight...
const NIGHT_TO = 7;    // ...until seven in the morning (not including 07:00)

const AWAKE = "zk-awake";
let awakeThisVisit = false; // for browsers that refuse storage

/** Hour and minute in Islamabad, e.g. { h: 3, m: 12, text: "03:12" } */
export function pkt(now: Date = new Date()): { h: number; m: number; text: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { h, m, text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

export function isNight(now: Date = new Date()): boolean {
  const { h } = pkt(now);
  return h >= NIGHT_FROM && h < NIGHT_TO;
}

function isAwake(): boolean {
  if (awakeThisVisit) return true;
  try { return sessionStorage.getItem(AWAKE) === "1"; } catch { return false; }
}

/** Someone woke him up: he stays awake for the rest of this visit */
export function wake() {
  awakeThisVisit = true;
  try { sessionStorage.setItem(AWAKE, "1"); } catch { /* storage refused */ }
  window.dispatchEvent(new Event("zk-wake"));
}

/** True while it is night in Islamabad and nobody has woken him up. Starts false so the server
    and the first paint agree, then follows the clock. */
export function useAsleep(): boolean {
  const [asleep, setAsleep] = useState(false);
  useEffect(() => {
    const check = () => setAsleep(isNight() && !isAwake());
    check();
    const id = window.setInterval(check, 30000);
    window.addEventListener("zk-wake", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("zk-wake", check);
    };
  }, []);
  return asleep;
}
