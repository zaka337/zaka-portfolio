/* The project estimator's brain (components/hire/Estimator.tsx). It turns what a visitor needs,
   roughly how big it is, and a few features into a range in weeks and a simple timeline, and
   writes a ready-made brief for the contact form.

   It is a rough guide from typical projects built by one developer, not a quote: Zaka confirms
   after reading the real brief. It shows timelines only, never prices (the owner's choice).
   Tune the numbers below freely. */

export const KINDS = ["Website", "Web app", "Mobile app", "QA & test automation", "AI & automation", "Something else"] as const;
export type Kind = (typeof KINDS)[number];

export const SIZES = ["Tiny", "Small", "Medium", "Large", "Very large"] as const;

/* Weeks for the base build at each size (index 0..4): [fastest, slowest] */
const BASE: Record<Kind, [number, number][]> = {
  "Website": [[0.5, 1], [1, 2], [2, 3.5], [3, 5], [5, 8]],
  "Web app": [[2, 4], [4, 7], [7, 11], [11, 16], [16, 24]],
  "Mobile app": [[3, 5], [5, 8], [8, 13], [13, 19], [19, 28]],
  "QA & test automation": [[0.5, 1.5], [1.5, 3], [3, 5], [5, 8], [8, 12]],
  "AI & automation": [[1, 2], [2, 4], [4, 7], [7, 11], [11, 16]],
  "Something else": [[1, 3], [3, 6], [6, 10], [10, 15], [15, 22]],
};

export interface Feature { id: string; label: string; weeks: [number, number]; kinds?: Kind[] }

export const FEATURES: Feature[] = [
  { id: "auth", label: "Accounts and login", weeks: [0.5, 1.5], kinds: ["Website", "Web app", "Mobile app", "Something else"] },
  { id: "pay", label: "Payments", weeks: [0.7, 2], kinds: ["Website", "Web app", "Mobile app", "Something else"] },
  { id: "admin", label: "Admin dashboard", weeks: [1, 3], kinds: ["Website", "Web app", "Mobile app", "Something else", "AI & automation"] },
  { id: "ai", label: "An AI feature", weeks: [1, 2.5] },
  { id: "motion", label: "3D or rich animation", weeks: [1, 3], kinds: ["Website", "Web app", "Mobile app", "Something else"] },
  { id: "cms", label: "Editable content (CMS)", weeks: [0.5, 1.5], kinds: ["Website", "Web app", "Something else"] },
  { id: "api", label: "Connecting other services", weeks: [0.5, 1.5] },
  { id: "tests", label: "Automated tests included", weeks: [0.5, 1.5], kinds: ["Website", "Web app", "Mobile app", "AI & automation", "Something else"] },
  { id: "ci", label: "Test runs in CI on every push", weeks: [0.3, 0.8], kinds: ["QA & test automation"] },
  { id: "report", label: "Reports and dashboards", weeks: [0.5, 1.5], kinds: ["QA & test automation", "AI & automation"] },
  { id: "i18n", label: "More than one language", weeks: [0.5, 1.5], kinds: ["Website", "Web app", "Mobile app", "Something else"] },
  { id: "seo", label: "Analytics and SEO", weeks: [0.3, 0.8], kinds: ["Website", "Web app", "Something else"] },
];

export const URGENCY = ["As soon as possible", "Within 1 to 3 months", "No rush"] as const;
export type Urgency = (typeof URGENCY)[number];
const WINDOW_WEEKS: Record<Urgency, number> = { "As soon as possible": 4, "Within 1 to 3 months": 13, "No rush": Infinity };

export interface Pick {
  kind: Kind;
  size: number;                 // 0..4
  features: string[];
  design: "have" | "need";
  urgency: Urgency;
}

export const featuresFor = (kind: Kind) => FEATURES.filter((f) => !f.kinds || f.kinds.includes(kind));

export interface Phase { id: string; label: string; weeks: number; start: number }
export interface Estimate {
  min: number;
  max: number;
  mid: number;
  phases: Phase[];
  load: number;                 // 0..1: how big a job it is, for the gauge
  loadLabel: string;
  window: "fits" | "tight" | "over" | "open";
  windowNote: string;
  parts: { label: string; weeks: number }[];
}

const round = (w: number) => Math.max(0.5, Math.round(w * 2) / 2);

export function estimate(p: Pick): Estimate {
  const [bMin, bMax] = BASE[p.kind][p.size];
  let min = bMin, max = bMax;
  const parts: { label: string; weeks: number }[] = [{ label: `${p.kind}, ${SIZES[p.size].toLowerCase()}`, weeks: (bMin + bMax) / 2 }];
  for (const id of p.features) {
    const f = FEATURES.find((x) => x.id === id);
    if (!f) continue;
    min += f.weeks[0];
    max += f.weeks[1];
    parts.push({ label: f.label, weeks: (f.weeks[0] + f.weeks[1]) / 2 });
  }
  if (p.design === "need") {
    min *= 1.15;
    max *= 1.25;
    parts.push({ label: "Design help", weeks: ((min + max) / 2) * 0.17 });
  }
  min = round(min);
  max = Math.max(min + 0.5, round(max));
  const mid = (min + max) / 2;

  // The weeks split into the usual stages of a project; design gets a bigger share when it is needed
  const shares: [string, string, number][] = [
    ["scope", "Scope and plan", 0.08],
    ["design", p.design === "need" ? "Design" : "Design review", p.design === "need" ? 0.2 : 0.05],
    ["build", "Build", 0.52],
    ["test", "Testing and fixes", 0.15],
    ["launch", "Launch and handover", 0.07],
  ];
  const total = shares.reduce((s, x) => s + x[2], 0);
  let t = 0;
  const phases: Phase[] = shares.map(([id, label, share]) => {
    const weeks = (share / total) * mid;
    const ph = { id, label, weeks, start: t };
    t += weeks;
    return ph;
  });

  const load = Math.min(1, Math.log2(1 + mid) / Math.log2(1 + 36));
  const loadLabel = mid <= 2 ? "A quick job" : mid <= 6 ? "A small project" : mid <= 14 ? "A substantial build" : "A big build";

  const w = WINDOW_WEEKS[p.urgency];
  let window: Estimate["window"] = "open";
  let windowNote = "No deadline, so the work can be planned around what matters most.";
  if (Number.isFinite(w)) {
    if (max <= w) { window = "fits"; windowNote = "This should fit inside the time you have in mind."; }
    else if (min <= w) { window = "tight"; windowNote = "Tight: it fits only at the fast end, or if the first version is kept smaller."; }
    else { window = "over"; windowNote = "Longer than the time you have in mind. Splitting it into a first version and a second one would help."; }
  }
  return { min, max, mid, phases, load, loadLabel, window, windowNote, parts };
}

const weeksText = (e: Estimate) => (e.min === e.max ? `${e.min}` : `${e.min} to ${e.max}`);

/** The brief that goes into the contact form */
export function briefText(p: Pick, e: Estimate): string {
  const names = p.features.map((id) => FEATURES.find((f) => f.id === id)?.label.toLowerCase()).filter(Boolean);
  return [
    `Hi Zaka, I'm looking for a ${p.kind.toLowerCase()} (${SIZES[p.size].toLowerCase()}).`,
    names.length ? `It would need: ${names.join(", ")}.` : "",
    p.design === "need" ? "I would also need help with the design." : "I already have the designs.",
    `Timeline: ${p.urgency.toLowerCase()}.`,
    `Your estimator suggested about ${weeksText(e)} weeks.`,
    "",
    "A little more about it: ",
  ].filter((l) => l !== "").join("\n");
}

export const weeksLabel = weeksText;

/** Maps the estimator's urgency to the contact form's timeline chips */
export const TIMELINE_CHIP: Record<Urgency, string> = {
  "As soon as possible": "ASAP",
  "Within 1 to 3 months": "1-3 months",
  "No rush": "Flexible",
};
