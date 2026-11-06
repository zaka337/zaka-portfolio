import { LLMCHECK, SITEPULSE } from "@/lib/sitepulseLinks";

/* Everything a visitor can use or open on the portfolio, in one list: the source for the /tools page (the hub, so nobody has
   to know an address), for its structured data and for its tests. When a new tool or page is added to the site, add it here
   and it is findable. Keep the blurbs as plain and exact as the pages themselves.

   `tags` are short facts shown on the card ("FREE", "10 SECONDS"). A card that is not published yet says so and links
   to the page that does exist. */

export interface HubItem {
  id: string;
  title: string;
  blurb: string;
  href: string;
  tags: string[];
}

export interface HubGroup {
  id: string;
  title: string;
  lead: string;
  items: HubItem[];
}

const soon = (published: boolean) => (published ? "OPEN SOURCE" : "OPEN SOURCE, BEING PUBLISHED");
// The source is public once it is on GitHub, even before the npm package exists (sitepulse is in that state).
const sitepulseOpen = SITEPULSE.onGitHub || SITEPULSE.published;

export const HUB: HubGroup[] = [
  {
    id: "tools",
    title: "Free tools",
    lead: "Use them now. Nothing to install, no account, nothing stored.",
    items: [
      { id: "site-check", title: "Website health check", blurb: "Paste an address and get a score and a fix for 35 checks of security, SEO, speed, accessibility and links.", href: "/tools/site-check", tags: ["FREE", "ABOUT 10 SECONDS"] },
      { id: "fit", title: "Job-fit check", blurb: "Paste a job description and see how my skills match it, and where they do not.", href: "/hire#fit", tags: ["FREE", "RUNS IN YOUR BROWSER"] },
      { id: "call", title: "Find a call time", blurb: "See the hours we are both working in your own time zone, and send a call request.", href: "/hire#call", tags: ["FREE"] },
      { id: "estimate", title: "Project estimate", blurb: "Say what you need and how big it is, and get a rough timeline.", href: "/hire#estimate", tags: ["FREE", "TIMELINE, NOT A PRICE"] },
      { id: "qa", title: "QA challenge", blurb: "Six bugs are hidden in a made-up checkout. Find them, then see the Playwright check that would catch each one.", href: "/qa-challenge", tags: ["A GAME FOR TESTERS"] },
    ],
  },
  {
    id: "open-source",
    title: "Open source, made by me",
    lead: sitepulseOpen && LLMCHECK.published
      ? "Tools I wrote and use, with the source on GitHub."
      : "Tools I wrote and use. The code is being published; the pages explain what each one does.",
    items: [
      { id: "sitepulse", title: "sitepulse", blurb: "The scanner behind the health check: a command line, an MCP server so an AI assistant can use it, and a library.", href: sitepulseOpen ? SITEPULSE.repo : "/tools/site-check", tags: [soon(sitepulseOpen), "TYPESCRIPT"] },
      { id: "llmcheck", title: "llmcheck", blurb: "Test an AI feature in CI: YAML test cases, repeated runs that catch flaky answers, a pass rate you choose, and JUnit reports.", href: "/tools/llmcheck", tags: [soon(LLMCHECK.published), "PYTHON"] },
    ],
  },
  {
    id: "work",
    title: "Work with me",
    lead: "Fixed-scope pieces of work, the hiring tools, and the quickest way to reach me.",
    items: [
      { id: "services", title: "Services", blurb: "Five fixed-scope offers, each with a written scope and timeline before any work starts.", href: "/services", tags: ["AUDIT", "TESTS", "WEBSITE", "AUTOMATION", "AI QUALITY"] },
      { id: "hire", title: "Hire me", blurb: "The job-fit check, the call helper and the estimator together, with my current availability.", href: "/hire", tags: ["ALSO IN URDU"] },
      { id: "brief", title: "Send a project brief", blurb: "Tell me what you need in a short form. It sends me your brief, or opens your mail app if sending is not possible.", href: "/contact-me", tags: ["A SHORT FORM"] },
      { id: "resume", title: "Resume", blurb: "One page, printable, with a PDF to download.", href: "/resume", tags: ["PDF"] },
    ],
  },
  {
    id: "explore",
    title: "Look around",
    lead: "The rest of the portfolio.",
    items: [
      { id: "projects", title: "Projects", blurb: "Six featured projects, each with a case study of what was built and how.", href: "/projects", tags: ["CASE STUDIES"] },
      { id: "all-projects", title: "All repositories", blurb: "Every public GitHub repository in a 3D carousel.", href: "/projects/all", tags: ["3D"] },
      { id: "about", title: "About", blurb: "My story, toolkit and journey from first HTML to production apps.", href: "/about", tags: [] },
      { id: "tldr", title: "The short version", blurb: "What I do, three projects worth opening, and how to work with me, on one screen.", href: "/tldr", tags: ["THIRTY SECONDS", "ALSO IN URDU"] },
      { id: "mini-mayhem", title: "MINI MAYHEM", blurb: "A playable 3D racing game in the browser. Four tiny cars, giant cartoon heads, one island.", href: "/mini-mayhem", tags: ["FREE GAME"] },
    ],
  },
];

export const HUB_COUNT = HUB.reduce((n, g) => n + g.items.length, 0);

/** The short line the home page shows beside its entry to the hub */
export const HUB_TEASER = "FREE TOOLS & SERVICES";
