import { SITE_URL } from "@/lib/site";

/* Single source of truth for the featured projects page and the case studies.
   Every claim below comes from the project's own repository or live site. */

export interface Project {
  slug: string;
  title: string;
  kind: string;
  year: string;
  status: string;
  role: string;
  bg: string;

  /* Featured page */
  pitch: string;
  points: string[];
  chips: string[];

  /* Case study */
  summary: string;
  goal: string;
  built: { title: string; text: string }[];
  stack: { group: string; items: string[] }[];
  facts: { value: string; label: string }[];
  outcome: string[];
  note?: string;

  live?: string;
  repo?: string;
  repoName?: string;
  language?: string;
  shot?: string;
}

const GH = "https://github.com/zaka337";

export const PROJECTS: Project[] = [
  {
    slug: "qa-with-zaka",
    title: "QA with Zaka",
    kind: "QA automation learning platform",
    year: "2026",
    status: "Live",
    role: "Design and full-stack development",
    bg: "#d4c9b0",
    pitch: "A full-stack learning platform for QA automation, built and shipped end to end.",
    points: ["4 courses, 24 modules, 80 lessons", "Stripe payments and protected lessons", "AI assistant, admin tools and CI"],
    chips: ["React", "TypeScript", "Vite", "Supabase", "Stripe"],
    summary:
      "QA with Zaka teaches QA automation through four structured courses: Python, Selenium, Playwright and Appium. Students sign up, work through lessons in a distraction-free player, track their progress and unlock the full courses with a paid plan.",
    goal:
      "Give people one place to learn QA automation from start to finish: structured courses, progress they can see, and a clear path from a free first module to full access.",
    built: [
      {
        title: "Courses and content",
        text: "Four courses covering 24 modules and 80 lessons. Course content is authored as JSON and loaded into the platform through an import tool, so adding a course does not need a code change.",
      },
      {
        title: "Student experience",
        text: "A dashboard with live progress bars, a \"Cinema Mode\" course player for distraction-free lessons, account settings and a full sign-up, login and password-reset flow.",
      },
      {
        title: "Payments and protected content",
        text: "Stripe Checkout runs through Supabase Edge Functions. A webhook verifies Stripe's signature and, once a payment succeeds, sets the student's plan (lifetime or monthly) and enrols them. The paywall is enforced in the database, not just the interface: a database view hides paid lesson content from anyone without access, so it cannot be bypassed by calling the API directly. Videos are served through signed links that expire after 15 minutes.",
      },
      {
        title: "Admin tools",
        text: "An admin dashboard to manage students and enrolments and to import new courses, backed by an audit log of admin actions.",
      },
      {
        title: "AI assistant",
        text: "A built-in chat assistant, served by an Edge Function and a hosted language model, that knows the site and the course catalogue and helps students find their way around.",
      },
      {
        title: "Quality checks",
        text: "Linting, unit tests and a production build run automatically on every push through GitHub Actions.",
      },
    ],
    stack: [
      { group: "Frontend", items: ["React 19", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Framer Motion", "React Router"] },
      { group: "Backend", items: ["Supabase (Auth, Postgres, Edge Functions)"] },
      { group: "Payments", items: ["Stripe Checkout and webhooks"] },
      { group: "AI", items: ["Groq-hosted language model"] },
      { group: "Quality and hosting", items: ["Vitest", "ESLint", "GitHub Actions", "Vercel"] },
    ],
    facts: [
      { value: "4", label: "courses" },
      { value: "24", label: "modules" },
      { value: "80", label: "lessons" },
      { value: "4", label: "serverless functions" },
    ],
    outcome: [
      "Live in production on Vercel.",
      "Every course opens with a free first module; the rest unlocks with a paid plan, enforced in the database.",
      "Lint, tests and build run on every push, so changes are checked before they ship.",
    ],
    live: "https://qa-with-zaka-4pc9.vercel.app/",
    repo: `${GH}/QA_with_ZAKA`,
    repoName: "QA_with_ZAKA",
    language: "TypeScript",
    shot: "/projects/qa-with-zaka.jpg",
  },
  {
    slug: "zong-health-scanner",
    title: "Zong Health Scanner",
    kind: "QA automation tool",
    year: "2026",
    status: "Internship project",
    role: "Design and development",
    bg: "#b0c9d4",
    pitch: "A website health scanner, built during my QA Automation internship at Zong 5G.",
    points: ["8 checks per scan, one emailed report", "Visual regression against an approved baseline", "Runs from a no-code n8n form"],
    chips: ["Python", "Flask", "Playwright", "axe-core", "Docker", "n8n"],
    summary:
      "A website health scanner built during my QA Automation internship at Zong 5G. Give it a URL and it loads the page in a real browser, then runs eight checks: visual changes, broken links, console errors, load time, SEO basics, security headers, mobile layout and accessibility. The results come back as one emailed report.",
    goal:
      "Catch problems on staging sites before users do, without someone checking every page by hand: pages that changed visually, links that no longer work, slow loads, weak SEO, missing security headers, mobile overflow and accessibility issues.",
    built: [
      {
        title: "Scanner engine",
        text: "A headless browser driven by Playwright loads each page, takes screenshots and inspects it, so the checks run against what a real user would see.",
      },
      {
        title: "Visual regression",
        text: "Each scan is compared with an approved baseline screenshot pixel by pixel. If more than 0.5% of the page changed, the scan flags it and saves a difference image showing exactly where.",
      },
      {
        title: "Links, SEO and security headers",
        text: "Links on the page are checked, with known bot-blocking sites such as LinkedIn handled so they do not raise false alarms. SEO signals are read from the page (title, meta description, a single h1, canonical link, Open Graph title and robots), and six security headers are verified: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy.",
      },
      {
        title: "Performance, mobile and accessibility",
        text: "Each scan records console errors and how long the page takes to become ready and to finish loading. It reloads the page at a 375px phone width to catch horizontal overflow, and runs axe-core to collect accessibility violations, rated by impact.",
      },
      {
        title: "API and dashboard",
        text: "A Flask API with endpoints to run a scan, approve a new baseline and list reports, protected by an API key, plus a small web dashboard and a health endpoint. Results get a severity rating and go out as an HTML email report.",
      },
      {
        title: "Automation with n8n",
        text: "An n8n workflow starts with a form and calls the scanner API, so non-developers can run a scan without touching code.",
      },
      {
        title: "Packaging and documentation",
        text: "The scanner ships as a Docker image built on the official Playwright image and served by Gunicorn, so it runs the same everywhere. A slide deck and a product document sit alongside the code.",
      },
    ],
    stack: [
      { group: "Scanner", items: ["Python", "Playwright", "axe-core", "Pillow", "NumPy"] },
      { group: "API", items: ["Flask", "Gunicorn"] },
      { group: "Automation", items: ["n8n"] },
      { group: "Packaging", items: ["Docker"] },
    ],
    facts: [
      { value: "8", label: "checks per scan" },
      { value: "6", label: "security headers" },
      { value: "0.5%", label: "visual change threshold" },
    ],
    outcome: [
      "Packaged as a Docker image that runs the same on any machine.",
      "Can be triggered from a no-code n8n form by people who do not write code.",
      "Documented with a slide deck and a product document.",
    ],
    repo: `${GH}/Zong-health-scanner`,
    repoName: "Zong-health-scanner",
    language: "JavaScript",
  },
  {
    slug: "momcare-ai",
    title: "MomCare AI",
    kind: "Machine learning API",
    year: "2026",
    status: "Prototype",
    role: "Model training and API",
    bg: "#d4b0c9",
    pitch: "A machine-learning backend that predicts maternal health risk.",
    points: ["Random Forest model on 17 inputs", "Low, mid or high risk with confidence scores", "FastAPI with validated requests"],
    chips: ["Python", "FastAPI", "scikit-learn"],
    summary:
      "The backend for MomCare AI: a FastAPI service that takes a patient's vitals, lifestyle and background details and predicts maternal health risk as low, mid or high, with a confidence score for each class.",
    goal:
      "Turn a set of everyday health and lifestyle measurements into an early risk signal that a maternal-care app can show.",
    built: [
      {
        title: "The model",
        text: "A Random Forest classifier with 200 trees and balanced class weights, trained on a dataset of about 1,000 records using a stratified 80/20 train and test split.",
      },
      {
        title: "17 input features",
        text: "Vitals (age, blood pressure, blood sugar, body temperature, heart rate), lifestyle (sleep, physical activity, stress), nutrition (diet quality and adherence, hemoglobin, iron and folic supplements) and background (education, income, urban or rural).",
      },
      {
        title: "Preprocessing",
        text: "Categorical answers such as income level or diet adherence are mapped to ordered numbers, and the three risk labels are encoded for training and decoded back for the response.",
      },
      {
        title: "Prediction API",
        text: "A FastAPI endpoint, POST /predict, validates every field with typed models and returns clear error messages for bad input. It responds with the predicted risk level and a confidence percentage for each class, and allows cross-origin requests so a frontend can call it.",
      },
      {
        title: "Model packaging",
        text: "The trained model and label encoder are saved with joblib and loaded once when the service starts.",
      },
    ],
    stack: [
      { group: "Machine learning", items: ["Python", "scikit-learn (Random Forest)", "pandas", "NumPy", "joblib"] },
      { group: "API", items: ["FastAPI", "Pydantic", "Gunicorn"] },
    ],
    facts: [
      { value: "17", label: "input features" },
      { value: "3", label: "risk classes" },
      { value: "200", label: "trees in the forest" },
      { value: "~1,000", label: "records in the dataset" },
    ],
    outcome: [
      "A working prediction API with a clearly defined request and response.",
      "Model and encoder ship with the backend, ready for an app to call.",
    ],
    note: "A prototype for demonstration. It is not a medical device and its predictions are not medical advice.",
    repo: `${GH}/momcare-ai-backend`,
    repoName: "momcare-ai-backend",
    language: "Python",
  },
  {
    slug: "glamourhub",
    title: "GlamourHub",
    kind: "E-commerce web app",
    year: "2024",
    status: "Live",
    role: "Design and development",
    bg: "#c9d4b0",
    pitch: "A premium e-commerce web app for the Pakistani market.",
    points: ["Makeup, dressing and jewelry collections", "Cart and account", "Live on Netlify"],
    chips: ["Vite", "JavaScript", "Netlify"],
    summary:
      "GlamourHub is a premium e-commerce web app for the Pakistani market, with separate collections for makeup, dressing and jewelry, a shopping cart, an account area and a rotating featured-collection hero.",
    goal:
      "A fashion and beauty storefront that feels premium, is quick to browse, and lets shoppers move from a featured collection to their cart in a few clicks.",
    built: [
      {
        title: "Storefront",
        text: "A home page with a rotating hero that showcases the latest collection, plus dedicated pages for Makeup, Dressing and Jewelry and an About page.",
      },
      {
        title: "Cart and account",
        text: "A cart with a live item count in the header and an account entry point, so shopping and sign-in are one tap away.",
      },
      {
        title: "Design",
        text: "A clean, premium look with soft gradients and generous spacing.",
      },
      {
        title: "Deployment",
        text: "Built with Vite and deployed on Netlify.",
      },
    ],
    stack: [
      { group: "Frontend", items: ["Vite", "JavaScript", "CSS"] },
      { group: "Hosting", items: ["Netlify"] },
    ],
    facts: [
      { value: "5", label: "pages" },
      { value: "3", label: "product collections" },
    ],
    outcome: [
      "Live and public on Netlify.",
      "Three product collections, a cart and an account entry point.",
    ],
    live: "https://glamourhubpk.netlify.app/",
    shot: "/projects/glamourhub.jpg",
  },
  {
    slug: "bazaarbox",
    title: "BazaarBox",
    kind: "Mobile e-commerce app",
    year: "2024",
    status: "Source on GitHub",
    role: "Design and development",
    bg: "#d4d0b0",
    pitch: "A cross-platform e-commerce app built in Flutter.",
    points: ["Firebase sign-in, including Google", "Cart, checkout and order confirmation", "Store registration and dashboard"],
    chips: ["Flutter", "Dart", "Firebase", "Riverpod"],
    summary:
      "A complete e-commerce app built with Flutter. Shoppers browse products, add them to a cart and check out, and store owners can register a store and manage it from a dashboard. Sign-in and data sync run on Firebase.",
    goal:
      "One mobile codebase that covers the whole shopping journey for customers and gives sellers a place to run their own store.",
    built: [
      {
        title: "Shopping flow",
        text: "Landing, home and category screens lead into product details, a cart, checkout and an order confirmation screen.",
      },
      {
        title: "Accounts",
        text: "Sign-up and login with Firebase Authentication, including Google sign-in, and a settings screen.",
      },
      {
        title: "Stores",
        text: "Store registration and a store dashboard, so sellers can set up and manage a shop inside the same app.",
      },
      {
        title: "Data and state",
        text: "Firebase Realtime Database keeps data in sync, and Riverpod providers manage authentication, cart, products and stores.",
      },
    ],
    stack: [
      { group: "App", items: ["Flutter", "Dart", "Riverpod"] },
      { group: "Backend", items: ["Firebase Authentication", "Firebase Realtime Database", "Google Sign-In"] },
    ],
    facts: [
      { value: "13", label: "screens" },
      { value: "4", label: "state providers" },
    ],
    outcome: [
      "A complete customer journey from landing page to order confirmation.",
      "Seller tools in the same app: store registration and a dashboard.",
    ],
    repo: `${GH}/ECOMMERCE-PLATFORM`,
    repoName: "ECOMMERCE-PLATFORM",
    language: "Dart",
  },
  {
    slug: "portfolio",
    title: "This Portfolio",
    kind: "3D interactive portfolio",
    year: "2026",
    status: "Live",
    role: "Design and development",
    bg: "#c4b0d4",
    pitch: "The 3D portfolio you are standing inside.",
    points: ["Cursor-tracking WebGL avatar", "Scroll-driven About and Projects pages", "A working Nokia 3310 contact page"],
    chips: ["Next.js", "React", "Three.js", "TypeScript"],
    summary:
      "This portfolio. A rigged 3D avatar follows your cursor, the About and Projects pages play out as scroll stories, and the contact page is a working Nokia 3310 plus a project brief builder.",
    goal:
      "A portfolio that shows the work by being the work: real-time 3D, careful motion and interaction details, while staying fast, accessible and easy to find in search.",
    built: [
      {
        title: "3D avatar",
        text: "A rigged avatar rendered with React Three Fiber. The head tracks the cursor, breathes and drifts while idle, nods when clicked, and the lighting and materials are tuned so it looks like a person rather than a flat model.",
      },
      {
        title: "Scroll stories",
        text: "The About and Projects pages are pinned, scroll-driven chapters. A small engine eases scroll progress into CSS variables every frame, so motion glides and stays on the compositor.",
      },
      {
        title: "Contact",
        text: "A working Nokia 3310 with a menu and multi-tap messaging, and a project brief builder that composes a ready-to-send email.",
      },
      {
        title: "Performance and search",
        text: "Compressed model and screenshots, a loading screen, structured data, a sitemap and a case study for each project.",
      },
    ],
    stack: [
      { group: "Framework", items: ["Next.js", "React 19", "TypeScript"] },
      { group: "3D", items: ["Three.js", "React Three Fiber"] },
      { group: "Hosting", items: ["Vercel"] },
    ],
    facts: [
      { value: "1", label: "rigged 3D avatar" },
      { value: "6", label: "case studies" },
    ],
    outcome: [
      "Live on Vercel.",
      "Structured data and a sitemap in place for search engines.",
    ],
    live: SITE_URL,
    repo: `${GH}/zaka-portfolio`,
    repoName: "zaka-portfolio",
    language: "TypeScript",
    shot: "/projects/portfolio.jpg",
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
