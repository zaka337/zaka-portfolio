/* The job-fit checker's brain (components/hire/FitChecker.tsx). It reads a pasted job description,
   finds the technologies and skills named in it, and compares them with what is on Zaka's resume
   and in his projects. It is plain keyword matching, not AI: a technology counts as "have" only
   if it is in lib/resume.ts or in a project's stack (lib/projects.ts); "related" means close but
   not the same thing, and says what the closest thing is; everything else is "not yet", said
   plainly. Nothing is sent anywhere: it all runs in the visitor's browser.

   To change what counts, edit SKILLS below. Proof (where a skill shows up) is found
   automatically by looking for the skill's aliases in the projects and the resume. */

import { PROJECTS } from "@/lib/projects";
import { resume } from "@/lib/resume";
import { SITE_URL } from "@/lib/site";

export type Have = "yes" | "related" | "no";

export interface SkillDef {
  id: string;
  name: string;
  aliases: string[];     // lowercase; matched as whole words
  have: Have;
  closest?: string;      // for "related": the nearest thing Zaka does
  note?: string;         // one honest line, shown with the skill
}

const y = (id: string, name: string, aliases: string[], note?: string): SkillDef => ({ id, name, aliases, have: "yes", note });
const r = (id: string, name: string, aliases: string[], closest: string, note?: string): SkillDef => ({ id, name, aliases, have: "related", closest, note });
const n = (id: string, name: string, aliases: string[], note?: string): SkillDef => ({ id, name, aliases, have: "no", note });

export const SKILLS: SkillDef[] = [
  // Frontend
  y("react", "React", ["react", "react.js", "reactjs"]),
  y("next", "Next.js", ["next.js", "nextjs"]),
  y("ts", "TypeScript", ["typescript"]),
  y("js", "JavaScript", ["javascript", "ecmascript", "es6"]),
  y("tailwind", "Tailwind CSS", ["tailwind css", "tailwindcss", "tailwind"]),
  y("html", "HTML", ["html", "html5"]),
  y("css", "CSS", ["css", "css3"]),
  y("three", "Three.js / WebGL", ["three.js", "threejs", "webgl"]),
  y("vite", "Vite", ["vite"]),
  y("responsive", "Responsive design", ["responsive design", "responsive web", "responsive interfaces", "responsive layouts", "responsive ui", "mobile-first", "mobile first", "cross-browser"]),
  y("a11y", "Accessibility", ["accessibility", "accessible interfaces", "accessible web", "wcag", "axe-core", "a11y"]),
  y("seo", "SEO", ["seo", "search engine optimization", "structured data"]),
  // Mobile
  y("flutter", "Flutter", ["flutter"]),
  y("dart", "Dart", ["dart"]),
  // Backend and data
  y("python", "Python", ["python"]),
  y("fastapi", "FastAPI", ["fastapi"]),
  y("flask", "Flask", ["flask"]),
  y("rest", "REST APIs", ["rest api", "rest apis", "restful", "restful apis", "web apis", "api development"]),
  y("supabase", "Supabase", ["supabase"]),
  y("firebase", "Firebase", ["firebase", "firestore"]),
  y("mongodb", "MongoDB", ["mongodb", "mongo db"]),
  y("sql", "SQL", ["sql"]),
  y("postgres", "PostgreSQL", ["postgresql", "postgres"], "Through Supabase, which is Postgres underneath."),
  y("numpy", "NumPy", ["numpy"]),
  y("stripe", "Stripe / payments", ["stripe", "payment gateway", "payments integration", "payment integration"]),
  // QA and testing
  y("qa", "QA", ["qa", "quality assurance", "sdet", "software tester", "test engineer", "qa engineer"]),
  y("testauto", "Test automation", ["test automation", "automated testing", "automation testing", "automated tests", "test automation framework", "automation framework", "test framework"]),
  y("playwright", "Playwright", ["playwright"]),
  y("selenium", "Selenium", ["selenium", "selenium webdriver", "webdriver"]),
  y("postman", "Postman", ["postman", "newman"]),
  y("jmeter", "JMeter", ["jmeter", "apache jmeter"]),
  y("vitest", "Vitest", ["vitest"]),
  y("apitest", "API testing", ["api testing", "api tests", "api test"]),
  y("perftest", "Performance testing", ["performance testing", "load testing", "stress testing"]),
  y("regression", "Regression testing", ["regression testing", "regression tests", "regression suite", "visual regression", "visual testing"]),
  // Automation, AI, tools
  y("n8n", "n8n", ["n8n"]),
  y("aidev", "AI-assisted development", ["ai-assisted development", "ai assisted development"]),
  y("llm", "LLM integration", ["llm", "llms", "large language model", "language model", "generative ai", "genai", "prompt engineering", "openai", "chatgpt"], "A hosted language model powers the assistant in QA with Zaka."),
  y("ml", "Machine learning", ["machine learning", "scikit-learn", "scikit learn", "sklearn", "random forest"]),
  y("git", "Git / GitHub", ["git", "github", "version control"]),
  y("gha", "GitHub Actions", ["github actions"]),
  y("cicd", "CI/CD", ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"]),
  y("docker", "Docker", ["docker", "containerization", "containerisation", "containers"]),
  y("vercel", "Vercel / Netlify", ["vercel", "netlify"]),

  // Close, but not the same thing
  r("cypress", "Cypress", ["cypress"], "Playwright", "The closest browser-testing tool I use is Playwright."),
  r("jest", "Jest / Mocha", ["jest", "mocha", "testing library", "react testing library"], "Vitest", "I use Vitest, which works the same way."),
  r("angular", "Angular", ["angular", "angularjs"], "React", "I build with React and Next.js."),
  r("vue", "Vue / Svelte", ["vue", "vue.js", "vuejs", "svelte", "nuxt"], "React", "I build with React and Next.js."),
  r("reactnative", "React Native", ["react native"], "Flutter", "I build cross-platform mobile apps with Flutter."),
  r("android", "Android / iOS apps", ["android", "ios"], "Flutter", "I ship to both through Flutter, not native Kotlin or Swift."),
  r("node", "Node.js / Express", ["node.js", "nodejs", "node", "express.js", "expressjs"], "Next.js server routes", "I write server code in Next.js and Python, not a standalone Node backend."),
  r("mysql", "MySQL", ["mysql", "mariadb"], "SQL", "I work in SQL and Postgres."),
  r("jenkins", "Jenkins / GitLab CI", ["jenkins", "gitlab ci", "gitlab-ci", "circleci", "azure devops"], "GitHub Actions", "My pipelines run on GitHub Actions."),
  r("zapier", "Zapier / Make", ["zapier", "make.com", "integromat"], "n8n", "I build workflow automation in n8n."),
  r("appium", "Appium", ["appium"], "Selenium and Playwright", "QA with Zaka has an Appium course; my hands-on automation is Selenium and Playwright."),
  r("aws", "AWS", ["aws", "amazon web services", "ec2"], "Docker and Vercel", "I have small AWS deployment practice repos on GitHub, but no production AWS work on my resume."),
  r("statemgmt", "State management", ["state management", "redux", "zustand", "mobx"], "Riverpod (Flutter)", "I use Riverpod in Flutter; Redux is not on my resume."),
  r("shopify", "Shopify / WooCommerce", ["shopify", "woocommerce"], "Custom storefronts", "I built an e-commerce storefront from scratch (GlamourHub), not on Shopify."),

  // Not on the resume
  n("java", "Java", ["java", "spring boot"]),
  n("csharp", "C# / .NET", ["c#", ".net", "dotnet", "asp.net"]),
  n("cpp", "C / C++", ["c++", "cpp"]),
  n("php", "PHP / Laravel", ["php", "laravel", "wordpress"]),
  n("ruby", "Ruby", ["ruby", "rails", "ruby on rails"]),
  n("go", "Go", ["golang"]),
  n("rust", "Rust", ["rust"]),
  n("kotlin", "Kotlin / Swift", ["kotlin", "swiftui", "objective-c"]),
  n("k8s", "Kubernetes", ["kubernetes", "k8s", "helm"]),
  n("iac", "Terraform / Ansible", ["terraform", "ansible", "infrastructure as code", "cloudformation"]),
  n("cloud", "Azure / Google Cloud", ["azure", "gcp", "google cloud"]),
  n("graphql", "GraphQL", ["graphql", "apollo"]),
  n("data", "Redis / Kafka / queues", ["redis", "kafka", "rabbitmq", "elasticsearch", "microservices"]),
  n("bdd", "Cucumber / BDD", ["cucumber", "bdd", "behave", "gherkin", "testng", "junit"]),
  n("sec", "Security testing", ["penetration testing", "pentest", "owasp", "security testing"]),
];

/* Roles a job description can lean towards, by the skills in it */
const ROLE_OF: Record<string, string> = {
  qa: "QA / test automation", testauto: "QA / test automation", playwright: "QA / test automation", selenium: "QA / test automation",
  cypress: "QA / test automation", appium: "QA / test automation", regression: "QA / test automation", apitest: "QA / test automation",
  react: "Frontend", next: "Frontend", angular: "Frontend", vue: "Frontend", tailwind: "Frontend", css: "Frontend",
  flutter: "Mobile", reactnative: "Mobile", android: "Mobile", dart: "Mobile",
  python: "Backend", node: "Backend", java: "Backend", csharp: "Backend", fastapi: "Backend", flask: "Backend", sql: "Backend",
  ml: "Data / AI", llm: "Data / AI",
  docker: "DevOps", k8s: "DevOps", iac: "DevOps", jenkins: "DevOps", cloud: "DevOps", aws: "DevOps",
};

export interface Detected {
  skill: SkillDef;
  mentions: number;
  /** Where it shows in Zaka's own work (empty when it does not, or only on the resume) */
  projects: { slug: string; title: string }[];
  experience: string[];
}
export interface Span { start: number; end: number; id: string; have: Have }
export interface Fit {
  detected: Detected[];
  spans: Span[];
  score: number;                 // 0..1
  verdict: "Strong fit" | "Good fit" | "Partial fit" | "Low fit";
  counts: { yes: number; related: number; no: number };
  role: string | null;
  yearsAsked: number | null;
  level: "senior" | "junior" | null;
  topProjects: { slug: string; title: string; hits: number }[];
  notes: string[];
}

/* Lower-case ASCII only, so the text keeps exactly the same length (match positions are used to highlight it) */
const lowerAscii = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = (alias: string) => new RegExp(`(^|[^a-z0-9+#.])(${esc(alias)})(?![a-z0-9+#])`, "gi");

/* Where a skill shows in the projects and the experience on the resume */
const WORK = PROJECTS.map((p) => ({
  slug: p.slug,
  title: p.title,
  text: ` ${[...p.chips, ...p.stack.flatMap((g) => g.items), p.title, p.kind].join(" | ").toLowerCase()} `,
}));
const EXPERIENCE = resume.experience.map((e) => ({
  label: `${e.org} (${e.period})`,
  text: ` ${[e.role, e.org, ...e.bullets].join(" | ").toLowerCase()} `,
}));

function proofFor(skill: SkillDef) {
  const projects: { slug: string; title: string }[] = [];
  const experience: string[] = [];
  if (skill.have !== "yes") return { projects, experience };
  const tests = skill.aliases.map((a) => new RegExp(`(^|[^a-z0-9+#.])${esc(a)}(?![a-z0-9+#])`, "i"));
  for (const w of WORK) if (tests.some((t) => t.test(w.text))) projects.push({ slug: w.slug, title: w.title });
  for (const e of EXPERIENCE) if (tests.some((t) => t.test(e.text))) experience.push(e.label);
  return { projects, experience };
}

/* The first words of a job post are its title ("Full-stack Developer for a product team"), so they
   decide. Failing that, the skills do: tooling like Docker or AWS counts for less, and a text with
   both frontend and backend skills is full-stack. */
const TITLE_CUES: [RegExp, string][] = [
  [/full[- ]?stack/, "Full-stack"],
  [/front[- ]?end/, "Frontend"],
  [/back[- ]?end/, "Backend"],
  [/\bmobile\b|flutter|android developer|ios developer/, "Mobile"],
  [/\bqa\b|quality assurance|test automation|sdet|test engineer/, "QA / test automation"],
  [/devops|site reliability|\bsre\b|platform engineer/, "DevOps"],
  [/data scientist|machine learning engineer|ml engineer|ai engineer/, "Data / AI"],
];
function leaning(low: string, detected: Detected[]): string | null {
  const head = low.slice(0, 90);
  for (const [rx, label] of TITLE_CUES) if (rx.test(head)) return label;
  const tally = new Map<string, number>();
  for (const d of detected) {
    const role = ROLE_OF[d.skill.id];
    if (role) tally.set(role, (tally.get(role) ?? 0) + d.mentions * (role === "DevOps" ? 0.5 : 1));
  }
  if ((tally.get("Frontend") ?? 0) > 0 && (tally.get("Backend") ?? 0) > 0) return "Full-stack";
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function analyse(raw: string, now: Date = new Date()): Fit {
  const text = raw.slice(0, 20000);
  let masked = lowerAscii(text);
  const found = new Map<string, { skill: SkillDef; mentions: number }>();
  const spans: Span[] = [];

  // Longest names first, and a found name is blanked out, so "React Native" is not also "React"
  const order = SKILLS.flatMap((s) => s.aliases.map((a) => ({ s, a }))).sort((p, q) => q.a.length - p.a.length);
  for (const { s, a } of order) {
    const rx = re(a);
    let m: RegExpExecArray | null;
    while ((m = rx.exec(masked))) {
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      masked = masked.slice(0, start) + " ".repeat(end - start) + masked.slice(end);
      spans.push({ start, end, id: s.id, have: s.have });
      const cur = found.get(s.id);
      if (cur) cur.mentions++; else found.set(s.id, { skill: s, mentions: 1 });
      rx.lastIndex = end;
    }
  }
  spans.sort((p, q) => p.start - q.start);

  const detected: Detected[] = [...found.values()]
    .map((f) => ({ ...f, ...proofFor(f.skill) }))
    .sort((p, q) => {
      const rank = { yes: 0, related: 1, no: 2 } as const;
      return rank[p.skill.have] - rank[q.skill.have] || q.mentions - p.mentions || p.skill.name.localeCompare(q.skill.name);
    });

  const counts = { yes: 0, related: 0, no: 0 };
  for (const d of detected) counts[d.skill.have]++;
  const total = detected.length;
  const score = total ? (counts.yes + counts.related * 0.5) / total : 0;
  const verdict = score >= 0.8 ? "Strong fit" : score >= 0.6 ? "Good fit" : score >= 0.35 ? "Partial fit" : "Low fit";

  // The role the text leans towards: what the title says, else whichever area has the most skills in it
  const role = leaning(lowerAscii(text), detected);

  // Years asked for, and how senior it sounds
  const low = lowerAscii(text);
  let yearsAsked: number | null = null;
  for (const m of low.matchAll(/(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*\+?\s*(?:years?|yrs?)/g)) {
    const v = Number(m[2] ?? m[1]);
    if (v > 0 && v < 30) yearsAsked = Math.max(yearsAsked ?? 0, v);
  }
  const level = /\b(senior|sr\.?|principal|staff engineer|head of|architect|tech lead|team lead|lead engineer|lead developer)\b/.test(low) ? "senior"
    : /\b(junior|jr\.?|entry[- ]level|graduate|intern|internship|trainee|fresher)\b/.test(low) ? "junior" : null;

  // The projects that show the most of what was asked for
  const hits = new Map<string, { title: string; hits: number }>();
  for (const d of detected) {
    if (d.skill.have !== "yes") continue;
    for (const p of d.projects) hits.set(p.slug, { title: p.title, hits: (hits.get(p.slug)?.hits ?? 0) + 1 });
  }
  const topProjects = [...hits.entries()].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.hits - a.hits).slice(0, 3);

  const since = 2024;
  const mine = Math.max(1, now.getFullYear() - since);
  const notes: string[] = [];
  if (yearsAsked !== null) {
    if (yearsAsked >= 4) notes.push(`This asks for ${yearsAsked}+ years. I have been building since ${since} (about ${mine} years) with two internships, so it may be a stretch.`);
    else if (yearsAsked === 3) notes.push(`This asks for ${yearsAsked} years. I have been building since ${since} (about ${mine} years), so it is borderline.`);
    else notes.push(`This asks for ${yearsAsked} year${yearsAsked === 1 ? "" : "s"}. I have been building since ${since}, so that is in range.`);
  }
  if (level === "senior") notes.push("This reads as a senior role. I am early in my career, so I would be a step up.");
  if (level === "junior") notes.push("This reads as an entry-level role, which is where I am.");

  return { detected, spans, score, verdict, counts, role, yearsAsked, level, topProjects, notes };
}

/** A plain-text summary a recruiter can paste into a message or an email */
export function summarise(f: Fit): string {
  const pick = (h: Have) => f.detected.filter((d) => d.skill.have === h).map((d) => d.skill.name);
  const lines = [
    `Fit check for Zaka Ullah Waheed: ${f.verdict} (${Math.round(f.score * 100)}%)`,
    f.role ? `Role leans: ${f.role}` : "",
    pick("yes").length ? `Have: ${pick("yes").join(", ")}` : "",
    pick("related").length ? `Close: ${f.detected.filter((d) => d.skill.have === "related").map((d) => `${d.skill.name} (closest: ${d.skill.closest})`).join(", ")}` : "",
    pick("no").length ? `Not yet: ${pick("no").join(", ")}` : "",
    ...f.notes,
    f.topProjects.length ? `Most relevant work: ${f.topProjects.map((p) => p.title).join(", ")}` : "",
    `Checked with the job-fit tool: ${SITE_URL}/hire`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Short job descriptions to try. The last one is a poor fit on purpose: the tool should say so. */
export const SAMPLES: { id: string; label: string; text: string }[] = [
  {
    id: "qa",
    label: "QA automation engineer",
    text: "We are hiring a QA Automation Engineer to own our test automation. You will build and maintain automated tests with Playwright or Selenium, write API tests in Postman, and run regression suites in our CI/CD pipeline on GitHub Actions. Python is our main language. Experience with Docker, performance testing with JMeter and accessibility testing is a plus. 1-2 years of experience.",
  },
  {
    id: "frontend",
    label: "Frontend developer (React)",
    text: "Frontend Developer wanted. You will build fast, accessible, responsive interfaces with React, Next.js and TypeScript, styled with Tailwind CSS. You will work with REST APIs, write unit tests with Jest, and deploy on Vercel. Familiarity with Git and CI/CD is expected. 2+ years of experience. Bonus: Three.js or WebGL.",
  },
  {
    id: "fullstack",
    label: "Full-stack developer",
    text: "Full-stack Developer for a product team. You will build features end to end with React, Node.js and PostgreSQL, design REST APIs, integrate Stripe payments, and ship on Docker. We use Supabase, Firebase and GitHub Actions. Experience with AWS and Redis is nice to have. 3+ years of experience.",
  },
  {
    id: "flutter",
    label: "Mobile developer (Flutter)",
    text: "Mobile Developer to build our Android and iOS apps in Flutter and Dart. You will use Firebase for auth and data, manage state with Riverpod or Redux, connect to REST APIs and publish to both stores. Git and CI/CD experience required. Junior or mid level.",
  },
  {
    id: "poor",
    label: "Senior Java backend (a poor fit)",
    text: "Senior Backend Engineer. You will design microservices in Java and Spring Boot, run them on Kubernetes on AWS, and manage infrastructure with Terraform. Experience with Kafka, Redis, GraphQL and PostgreSQL is required. 7+ years of experience.",
  },
];
