import { SITE_URL, SOCIAL } from "@/lib/site";

/* Resume content. Facts come from the About page, the project repositories and the
   live sites. Anything not known (exact dates, grades, certificates) is left out. */

export const RESUME_PDF = "/Zaka-Ullah-Waheed-Resume.pdf";

export const resume = {
  name: "Zaka Ullah Waheed",
  title: "Full-Stack Developer and QA Automation Engineer",
  location: "Islamabad, Pakistan",
  contact: [
    { label: "zakas2379@gmail.com", href: `mailto:${SOCIAL.email}` },
    { label: "linkedin.com/in/zaka-ullah-waheed-80380832a", href: SOCIAL.linkedin },
    { label: "github.com/zaka337", href: SOCIAL.github },
    { label: SITE_URL.replace(/^https?:\/\//, ""), href: SITE_URL },
  ],

  summary:
    "Frontend and full-stack developer who designs, builds and ships web platforms end to end: React frontends, backend APIs, database integration and production deployment. Brings a QA mindset to everything built, with reliability baked in from the start. Currently deepening Next.js, AI-assisted development and n8n workflow automation. Open to remote work.",

  experience: [
    {
      role: "QA Automation Intern",
      org: "Zong 5G",
      period: "2026",
      bullets: [
        "Built a website health scanner (Python, Flask, Playwright) that runs eight checks per scan: visual regression against an approved baseline, broken links, console errors, load time, SEO basics, six security headers, mobile layout and accessibility (axe-core).",
        "Packaged it as a Docker image and connected it to an n8n form, so non-developers can trigger a scan and receive an emailed report.",
        "Documented the tool with a slide deck and a product document.",
      ],
    },
    {
      role: "Frontend Developer Intern",
      org: "Apexify Technologies",
      period: "2025",
      bullets: [
        "Built production-ready React interfaces.",
        "Deepened Next.js for production-scale work and sharpened full-stack integration skills.",
      ],
    },
  ],

  projects: [
    {
      name: "QA with Zaka",
      meta: "React, TypeScript, Vite, Supabase, Stripe",
      link: "qa-with-zaka-4pc9.vercel.app",
      bullets: [
        "QA automation learning platform with 4 courses (24 modules, 80 lessons), a student dashboard with progress tracking and an admin dashboard.",
        "Stripe Checkout and webhooks through Supabase Edge Functions; paywall enforced in the database, with signed, expiring video links.",
        "AI assistant for students; lint, tests and build run on every push with GitHub Actions.",
      ],
    },
    {
      name: "MomCare AI",
      meta: "Python, FastAPI, scikit-learn",
      link: "github.com/zaka337/momcare-ai-backend",
      bullets: [
        "Trained a Random Forest classifier on 17 health, lifestyle and background features to predict maternal health risk as low, mid or high.",
        "Served it through a validated FastAPI endpoint that returns a confidence score for each class.",
      ],
    },
    {
      name: "BazaarBox",
      meta: "Flutter, Dart, Firebase, Riverpod",
      link: "github.com/zaka337/ECOMMERCE-PLATFORM",
      bullets: [
        "Cross-platform e-commerce app: product browsing, cart, checkout and order confirmation, with Firebase and Google sign-in.",
        "Store registration and a seller dashboard in the same app.",
      ],
    },
    {
      name: "GlamourHub",
      meta: "Vite, Netlify",
      link: "glamourhubpk.netlify.app",
      bullets: [
        "Premium e-commerce storefront for the Pakistani market with makeup, dressing and jewelry collections, a cart and an account entry point.",
      ],
    },
    {
      name: "This portfolio",
      meta: "Next.js, React, Three.js, TypeScript",
      link: SITE_URL.replace(/^https?:\/\//, ""),
      bullets: [
        "Rigged 3D avatar in WebGL, scroll-driven pages, a case study for every project, structured data and a sitemap.",
      ],
    },
  ],

  skills: [
    { group: "Frontend", items: "React, Next.js, TypeScript, JavaScript, Tailwind CSS, HTML5, CSS3, Three.js" },
    { group: "Mobile", items: "Flutter, Dart" },
    { group: "Backend and data", items: "Python (FastAPI, Flask), REST APIs, Supabase, Firebase, MongoDB, SQL" },
    { group: "QA and testing", items: "Playwright, Selenium WebDriver, Postman and Newman, Apache JMeter, Vitest, GitHub Actions" },
    { group: "Automation and AI", items: "n8n workflows, AI-assisted development, scikit-learn" },
    { group: "Tools", items: "Git and GitHub, Docker, Vercel, Netlify" },
  ],

  education: [
    {
      school: "Air University",
      degree: "BS Information Technology",
      period: "Started 2022",
    },
  ],
};
