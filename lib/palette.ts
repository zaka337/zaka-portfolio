import { PROJECTS } from "@/lib/projects";
import { RESUME_PDF } from "@/lib/resume";
import { SOCIAL } from "@/lib/site";

/* What the search panel (components/Palette.tsx, Ctrl+K) can find, and how it ranks it.
   Only things a visitor is meant to find are in here: the hidden features are not. `words` are
   the other things a person might type for the same thing ("cv" for the resume, "price" for the
   estimator). Searching a skill ("playwright") finds the projects that used it, because each
   project's tech chips are part of its words. */

export type Act =
  | { t: "go"; href: string }
  | { t: "ext"; href: string }
  | { t: "mail"; href: string }
  | { t: "ui"; id: "theme" | "tour" | "access" | "copy" | "resume" | "doodle" };

export type GroupName = "Page" | "Project" | "Action" | "Link";

export interface Item {
  id: string;
  group: GroupName;
  title: string;
  hint: string;
  words: string;
  act: Act;
}

const page = (id: string, title: string, hint: string, href: string, words: string): Item => ({ id, group: "Page", title, hint, words, act: { t: "go", href } });

export const ITEMS: Item[] = [
  page("home", "Home", "The 3D face and the five doors", "/", "start landing main avatar face"),
  page("about", "About", "Story, toolkit and journey", "/about", "bio story skills toolkit journey education experience background who react next.js typescript"),
  page("projects", "Projects", "Six featured projects with case studies", "/projects", "work portfolio case studies featured built"),
  page("all", "All projects", "Every repository in a 3D carousel", "/projects/all", "repos github repositories carousel code"),
  page("resume", "Resume", "One page, printable", "/resume", "cv curriculum vitae experience print"),
  page("tldr", "TL;DR", "The whole portfolio on one screen", "/tldr", "tldr short summary overview brief quick version thirty seconds"),
  page("hire", "Hire me", "Job-fit check, call times, estimate", "/hire", "hiring job recruit employ work with remote"),
  page("fit", "Job-fit check", "Paste a job description, see the match", "/hire#fit", "job description match skills check requirements"),
  page("call", "Find a call time", "A time that works in your zone", "/hire#call", "meeting book schedule time zone calendar interview availability"),
  page("estimate", "Project estimate", "A rough timeline for your project", "/hire#estimate", "price cost quote timeline how long budget"),
  page("qa", "QA challenge", "Break this checkout", "/qa-challenge", "game bug test checkout break tester quality"),
  page("brief", "Send a project brief", "Tell him what you need", "/contact-me", "contact message email form inquiry hire write"),
  page("nokia", "The phone", "Pick up a Nokia, iPhone, Pixel or Nothing", "/contact", "contact nokia iphone pixel phone snake call"),
  ...PROJECTS.map((p): Item => ({
    id: `p-${p.slug}`,
    group: "Project",
    title: p.title,
    hint: `${p.kind} (${p.status})`,
    words: `${p.chips.join(" ")} ${p.kind} ${p.status} ${p.year} case study`,
    act: { t: "go", href: `/projects/${p.slug}` },
  })),
  { id: "theme", group: "Action", title: "Switch dark or light mode", hint: "Changes the whole site", words: "dark light mode night day theme colours", act: { t: "ui", id: "theme" } },
  { id: "tour", group: "Action", title: "Take the 60-second tour", hint: "A guided walk around the site", words: "walk guide show me around intro demo", act: { t: "ui", id: "tour" } },
  { id: "access", group: "Action", title: "Reading and access options", hint: "Bigger text, easy-read font, contrast, calm mode", words: "accessibility text size font contrast calm reduce motion read aloud dyslexia", act: { t: "ui", id: "access" } },
  { id: "doodle", group: "Action", title: "Doodle with the cursor", hint: "Hold D and move the mouse", words: "draw paint pen ink sketch play fun", act: { t: "ui", id: "doodle" } },
  { id: "copy", group: "Action", title: "Copy a link to this page", hint: "For sharing", words: "share url address clipboard", act: { t: "ui", id: "copy" } },
  { id: "pdf", group: "Action", title: "Download the resume (PDF)", hint: RESUME_PDF.replace("/", ""), words: "cv download pdf file", act: { t: "ui", id: "resume" } },
  { id: "github", group: "Link", title: "GitHub", hint: "github.com/zaka337", words: "code repos source", act: { t: "ext", href: SOCIAL.github } },
  { id: "linkedin", group: "Link", title: "LinkedIn", hint: "Profile", words: "profile network career", act: { t: "ext", href: SOCIAL.linkedin } },
  { id: "instagram", group: "Link", title: "Instagram", hint: "@notxzaka", words: "social photos", act: { t: "ext", href: SOCIAL.instagram } },
  { id: "email", group: "Link", title: "Email", hint: SOCIAL.email, words: "mail message write contact", act: { t: "mail", href: `mailto:${SOCIAL.email}` } },
  { id: "whatsapp", group: "Link", title: "WhatsApp", hint: "Start a chat", words: "chat message text", act: { t: "ext", href: "/whatsapp" } },
];

/* What shows before anything is typed */
export const SUGGESTED = ["about", "projects", "tldr", "hire", "resume", "brief", "tour", "theme"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();

/** Edit distance up to 1 (substitution, insertion, deletion): enough to forgive one typo */
function near(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

const prepared = ITEMS.map((it) => {
  const title = norm(it.title);
  return { it, title, titleWords: title.split(" "), words: norm(it.words), wordList: norm(it.words).split(" "), hint: norm(it.hint) };
});

function scoreToken(p: (typeof prepared)[number], t: string): number {
  let best = 0;
  if (p.title.startsWith(t)) best = 100;
  else if (p.titleWords.some((w) => w.startsWith(t))) best = 80;
  else if (p.title.includes(t)) best = 55;
  if (best < 45 && p.wordList.some((w) => w.startsWith(t))) best = Math.max(best, 45);
  if (best < 25 && p.words.includes(t)) best = Math.max(best, 25);
  if (best < 15 && p.hint.includes(t)) best = Math.max(best, 15);
  if (!best && t.length >= 5 && (p.titleWords.some((w) => near(t, w)) || p.wordList.some((w) => near(t, w)))) best = 20;
  return best;
}

/** Items matching every word of the query, best first. An empty query gives the suggestions. */
export function search(query: string, limit = 12): Item[] {
  const q = norm(query);
  if (!q) return SUGGESTED.map((id) => ITEMS.find((i) => i.id === id)!).filter(Boolean);
  const tokens = q.split(" ");
  const scored: { it: Item; s: number; i: number }[] = [];
  prepared.forEach((p, i) => {
    let total = 0;
    for (const t of tokens) {
      const s = scoreToken(p, t);
      if (!s) return;
      total += s;
    }
    scored.push({ it: p.it, s: total, i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.slice(0, limit).map((x) => x.it);
}
