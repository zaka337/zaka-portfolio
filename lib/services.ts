import { estimate, type Pick } from "@/lib/estimate";

/* The fixed-scope offers on /services. One place for the wording, so the page, its search data and the contact form's
   ready-made message all say the same thing.

   Timelines are not typed in: they come from the same estimator as the /hire page (lib/estimate.ts), so the two pages
   can never disagree, and changing the estimator's numbers updates both. There are no prices on purpose (the owner's
   choice, see the note at the top of lib/estimate.ts): each piece is priced in writing, before any work starts. */

export interface Service {
  id: string;
  n: string;
  title: string;
  forWho: string;
  summary: string;
  gets: string[];
  needs: string[];
  notIncluded: string[];
  /** What the estimator is asked, to produce the timeline */
  pick: Pick;
  /** The contact form's "what do you need" chip */
  need: string;
  proof: { label: string; href: string }[];
}

const pick = (kind: Pick["kind"], size: number, features: string[] = []): Pick => ({ kind, size, features, design: "have", urgency: "No rush" });

export const SERVICES: Service[] = [
  {
    id: "audit",
    n: "01",
    title: "Website health audit",
    forWho: "Anyone with a live website who suspects it is slower, less secure or harder to find than it should be.",
    summary: "I run your site through the same checks as the free site-health tool, go through it by hand, and give you a written, ranked list of what to fix and how.",
    gets: [
      "A written report on security headers, search basics, speed hints, accessibility basics and broken links",
      "Every finding ranked by how much it matters, each with the exact fix",
      "A walkthrough call to go through the report together",
      "Optionally, the fixes themselves as a follow-on piece of work",
    ],
    needs: ["The address of the site, and a staging copy if there is one", "Anything you already know is broken or slow"],
    notIncluded: ["Making the fixes (quoted separately)", "Penetration testing or a legal accessibility certificate"],
    pick: pick("QA & test automation", 0),
    need: "QA & test automation",
    proof: [
      { label: "Try the free check", href: "/tools/site-check" },
      { label: "Zong Health Scanner (case study)", href: "/projects/zong-health-scanner" },
    ],
  },
  {
    id: "tests",
    n: "02",
    title: "Automated tests for your web app",
    forWho: "Teams that ship often and are tired of finding bugs after release.",
    summary: "A Playwright test suite for the journeys that matter most, running automatically on every push, with reports your whole team can read.",
    gets: [
      "Automated tests for the critical journeys we agree on (sign-up, login, checkout...)",
      "The tests run in your CI on every push, with a clear pass or fail result",
      "A readable structure, so your team can add tests later without starting over",
      "A short guide to running and extending them",
    ],
    needs: ["Access to a test or staging environment", "The list of journeys that matter most", "Test accounts or test data"],
    notIncluded: ["Load and performance testing", "Fixing the bugs the tests find (quoted separately)", "Native mobile apps (web apps only)"],
    pick: pick("QA & test automation", 1, ["ci"]),
    need: "QA & test automation",
    proof: [
      { label: "Zong Health Scanner (case study)", href: "/projects/zong-health-scanner" },
      { label: "QA with Zaka (case study)", href: "/projects/qa-with-zaka" },
    ],
  },
  {
    id: "website",
    n: "03",
    title: "A fast marketing website in Next.js",
    forWho: "A business, product or person who needs a site that loads quickly, looks good and can actually be found.",
    summary: "A responsive site of up to five pages built in Next.js and React, with the search basics done properly and the speed and accessibility checked before launch.",
    gets: [
      "Up to five pages, responsive from phone to wide desktop",
      "Titles, descriptions, sitemap and structured data set up for search engines",
      "Speed and accessibility checked before it goes live",
      "A contact form that works, deployed to your own hosting account",
    ],
    needs: ["Your text and images, or a short call to shape them", "Designs or a clear reference to follow (design help is possible and adds time)"],
    notIncluded: ["Writing all of your copy", "Ongoing SEO campaigns or advertising", "Online payments or user accounts (bigger pieces, ask me)"],
    pick: pick("Website", 1, ["seo"]),
    need: "Website",
    proof: [
      { label: "This portfolio (case study)", href: "/projects/portfolio" },
      { label: "GlamourHub (case study)", href: "/projects/glamourhub" },
    ],
  },
  {
    id: "automation",
    n: "04",
    title: "Automate one repetitive workflow",
    forWho: "Anyone who copies things between tools every day: leads, reports, notifications, data entry.",
    summary: "One workflow built end to end with n8n, with an AI step where it helps, connected to the tools you already use.",
    gets: [
      "One workflow, built and tested from trigger to result",
      "Connected to your tools through their APIs",
      "Error handling and alerts, so it does not fail silently",
      "A one-page description of how it works and how to change it",
    ],
    needs: ["A clear description of how the process works by hand today", "Access to the tools involved (accounts or API keys, shared safely)"],
    notIncluded: ["Several workflows at once (each is its own piece)", "Tools that offer no API or export"],
    pick: pick("AI & automation", 0, ["api"]),
    need: "AI & automation",
    proof: [{ label: "Zong Health Scanner (n8n alerts, case study)", href: "/projects/zong-health-scanner" }],
  },
  {
    id: "ai-quality",
    n: "05",
    title: "Quality checks for your AI feature",
    forWho: "Teams shipping a chatbot, an assistant or any feature built on a language model, with no way to tell whether it got worse.",
    summary: "A test suite for your AI feature, built with llmcheck, the open-source tool I wrote for this: the facts it must get right, the things it must never say, run repeatedly so a flaky answer shows up, and wired into CI.",
    gets: [
      "Test cases written from your real prompts, policies and past mistakes",
      "Checks for facts, format, refusals, prompt leaks and injection attempts",
      "Repeated runs with a pass rate, so one lucky answer does not hide a flaky one",
      "A CI job and a readable report (JUnit and Markdown) on every pull request",
    ],
    needs: ["Access to the feature or its endpoint (a test key with a spending limit)", "Your system prompt and policies, and examples of answers that were wrong", "Someone who can say what a correct answer looks like"],
    notIncluded: ["Improving the model or rewriting your prompts (quoted separately)", "A guarantee that the feature never fails: tests find what you thought to test", "Legal, safety or compliance sign-off"],
    pick: pick("AI & automation", 0, ["tests"]),
    need: "AI & automation",
    proof: [
      { label: "llmcheck, the tool behind it", href: "/tools/llmcheck" },
      { label: "QA with Zaka (has an AI assistant, case study)", href: "/projects/qa-with-zaka" },
    ],
  },
];

/** "3 to 8 working days" or "2 to 4 weeks", from the estimator ("0.5 weeks" reads badly, so a fastest case under a week is shown in days) */
export function timelineOf(p: Pick): string {
  const e = estimate(p);
  if (e.min < 1) return `${Math.max(2, Math.round(e.min * 5))} to ${Math.round(e.max * 5)} working days`;
  return e.min === e.max ? `${e.min} weeks` : `${e.min} to ${e.max} weeks`;
}

/** The message the "Ask about this" button puts in the contact form */
export function askMessage(s: Service): string {
  return [`Hi Zaka, I'd like to ask about "${s.title}" (typical time: ${timelineOf(s.pick)}).`, "", "A little about my project: "].join("\n");
}

export const STEPS = [
  { title: "A short call or a written brief", text: "You tell me what you need. If it fits one of the pieces above, we start from that; if not, we shape it together." },
  { title: "A written scope, timeline and price", text: "Before any work starts you get all three in writing, and you approve them. Anything outside the scope is agreed separately instead of quietly growing." },
  { title: "Building, with regular demos", text: "You see the work as it takes shape, so there are no surprises at the end." },
  { title: "Handover", text: "The code goes in your repository, deployed where you want it, with short notes on how it works." },
] as const;
