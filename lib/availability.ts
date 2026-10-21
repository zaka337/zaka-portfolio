/* The meeting helper's brain (components/hire/MeetHelper.tsx): Zaka's working hours turned into
   the visitor's own time zone, the best half-hour slots where both of them are awake and working,
   and a calendar file for the one they pick. Nothing is booked: it is a request, and Zaka
   confirms each call by email.

   His hours are set here. Change them freely. Pakistan has no daylight saving, but the visitor's
   zone may, so every time is worked out with the browser's own time-zone data. */

export const AVAIL = {
  tz: "Asia/Karachi",
  place: "Islamabad",
  days: [1, 2, 3, 4, 5],     // Monday to Friday, in Pakistan time (0 is Sunday)
  from: 10 * 60,             // 10:00
  to: 18 * 60,               // 18:00
  slot: 30,                  // minutes
};

export const ZONES = [
  "Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata", "Asia/Dhaka", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland", "Europe/London", "Europe/Berlin", "Europe/Paris", "Europe/Istanbul",
  "Europe/Moscow", "Africa/Cairo", "Africa/Lagos", "Africa/Johannesburg", "America/Sao_Paulo",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto",
  "America/Vancouver", "America/Mexico_City", "UTC",
];

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmts = new Map<string, Intl.DateTimeFormat>();

function parts(d: Date, tz: string): { wd: number; min: number; sec: number } {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", weekday: "short", hour: "numeric", minute: "numeric", second: "numeric" });
    fmts.set(tz, f);
  }
  const p = f.formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  return { wd: WD[get("weekday")] ?? 0, min: (Number(get("hour")) % 24) * 60 + Number(get("minute")), sec: Number(get("second")) };
}

/** Midnight (the start of the local day) of the day the instant falls in, in that zone */
function midnight(d: Date, tz: string): Date {
  const { min, sec } = parts(d, tz);
  return new Date(d.getTime() - min * 60000 - sec * 1000 - (d.getTime() % 1000));
}

export function isValidZone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}
export function localZone(): string {
  try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; return z && isValidZone(z) ? z : "UTC"; } catch { return "UTC"; }
}

/** "UTC+5", "UTC-4:30" */
export function offsetLabel(tz: string, d: Date = new Date()): string {
  try {
    const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(d).find((x) => x.type === "timeZoneName")?.value ?? "";
    return s.replace("GMT", "UTC") || "UTC";
  } catch { return ""; }
}

export function clock(d: Date, tz: string, seconds = false): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hourCycle: "h23" }).format(d);
}
export function clock12(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}
/** The time as the visitor's own locale writes it (12 or 24 hour) */
export function clockLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
}
export function dayLabel(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(d);
}

export interface Cell { t: Date; zaka: boolean; you: boolean; past: boolean }
export interface Day { label: string; today: boolean; cells: Cell[] }

const LEAD_MS = 2 * 3600000; // nobody books a call starting in the next two hours

export function zakaWorking(t: Date): boolean {
  const { wd, min } = parts(t, AVAIL.tz);
  return AVAIL.days.includes(wd) && min >= AVAIL.from && min + AVAIL.slot <= AVAIL.to;
}

/** The next seven days, in the visitor's zone, as half-hour cells marked for each of them */
export function buildWeek(now: Date, tz: string, hours: { from: number; to: number }, days = 7): Day[] {
  const start0 = midnight(now, tz);
  const out: Day[] = [];
  for (let d = 0; d < days; d++) {
    const ref = new Date(start0.getTime() + d * 86400000 + 12 * 3600000);
    const dayStart = midnight(ref, tz);
    const cells: Cell[] = [];
    for (let i = 0; i < 48; i++) {
      const t = new Date(dayStart.getTime() + i * AVAIL.slot * 60000);
      const { min } = parts(t, tz);
      cells.push({ t, zaka: zakaWorking(t), you: min >= hours.from && min + AVAIL.slot <= hours.to, past: t.getTime() < now.getTime() });
    }
    out.push({ label: dayLabel(ref, tz), today: d === 0, cells });
  }
  return out;
}

export interface Slot { start: Date; end: Date; outside: boolean }

/** Up to three good slots: the middle of the longest shared stretch on the first few days. If the
    two working days never meet, the closest times to the visitor's day instead, marked as outside. */
export function suggest(week: Day[], now: Date, tz: string, hours: { from: number; to: number }, max = 3): Slot[] {
  const ok = (c: Cell) => c.t.getTime() >= now.getTime() + LEAD_MS;
  const slots: Slot[] = [];
  for (const day of week) {
    let best: Cell[] = [];
    let run: Cell[] = [];
    for (const c of day.cells) {
      if (c.zaka && c.you && ok(c)) run.push(c);
      else { if (run.length > best.length) best = run; run = []; }
    }
    if (run.length > best.length) best = run;
    if (best.length) {
      const c = best[Math.floor((best.length - 1) / 2)];
      slots.push({ start: c.t, end: new Date(c.t.getTime() + AVAIL.slot * 60000), outside: false });
      if (slots.length >= max) return slots;
    }
  }
  if (slots.length) return slots;

  // No overlap this week: offer the times nearest to the visitor's day, never in the dead of night
  const mid = (hours.from + hours.to) / 2;
  for (const day of week) {
    let pick: Cell | null = null;
    let dist = Infinity;
    for (const c of day.cells) {
      if (!(c.zaka && ok(c))) continue;
      const { min } = parts(c.t, tz);
      if (min < 5 * 60 + 30 || min > 23 * 60 + 30) continue;
      const dd = Math.abs(min - mid);
      if (dd < dist) { dist = dd; pick = c; }
    }
    if (pick) slots.push({ start: pick.t, end: new Date(pick.t.getTime() + AVAIL.slot * 60000), outside: true });
    if (slots.length >= max) break;
  }
  return slots;
}

/** Is he working right now, and if not, when does he next start? */
export function status(now: Date): { open: boolean; next: Date | null } {
  if (zakaWorking(now)) return { open: true, next: null };
  // Look forward from the next half hour on the clock, so the answer is "10:00", never "10:10"
  const step = AVAIL.slot * 60000;
  const base = Math.ceil(now.getTime() / step) * step;
  for (let i = 0; i <= 24 * 7 * 2; i++) {
    const t = new Date(base + i * step);
    if (zakaWorking(t)) return { open: false, next: t };
  }
  return { open: false, next: null };
}

const z = (n: number) => String(n).padStart(2, "0");
const ics = (d: Date) => `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}T${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z`;
const fold = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** A calendar file (.ics) for a requested call */
export function makeIcs(slot: Slot, topic: string): string {
  const now = new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zaka Ullah Waheed//Portfolio call request//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ics(slot.start)}-${Math.random().toString(36).slice(2, 10)}@zaka-portfolio`,
    `DTSTAMP:${ics(now)}`,
    `DTSTART:${ics(slot.start)}`,
    `DTEND:${ics(slot.end)}`,
    "SUMMARY:Call with Zaka Ullah Waheed (requested)",
    `DESCRIPTION:${fold(`A call request, not yet confirmed: Zaka confirms by email.${topic ? ` Topic: ${topic}` : ""}`)}`,
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
