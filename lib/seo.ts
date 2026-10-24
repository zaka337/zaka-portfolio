import { SITE_URL, SITE_NAME, SOCIAL } from "@/lib/site";

/* One place for the structured data every page shares. The ids are stable so a page can point at
   the person or the site by id instead of repeating them. */

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** The sitemap's lastmod. Bump it when the content of the site really changes, not on every deploy. */
export const LAST_UPDATED = "2026-10-24";

/** JSON for a <script type="application/ld+json">. "<" is escaped so the data can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE_NAME,
    alternateName: ["Zaka Waheed", "Zaka"],
    url: SITE_URL,
    image: { "@type": "ImageObject", url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 },
    sameAs: [SOCIAL.github, SOCIAL.linkedin, SOCIAL.instagram],
    jobTitle: "Full-Stack Developer and QA Automation Engineer",
    description:
      "Full-stack developer and QA automation engineer from Islamabad, Pakistan. Builds web apps with React and Next.js, mobile apps with Flutter, and automated tests with Playwright. Creator of QA with Zaka. Open to remote work.",
    email: SOCIAL.email,
    address: { "@type": "PostalAddress", addressLocality: "Islamabad", addressCountry: "PK" },
    affiliation: { "@type": "CollegeOrUniversity", name: "Air University", url: "https://www.au.edu.pk" },
    hasOccupation: {
      "@type": "Occupation",
      name: "Full-Stack Developer",
      description: "Builds production web apps, mobile apps and QA automation tools with React, Next.js, Flutter, Firebase and TypeScript.",
      occupationalCategory: "15-1252.00",
      skills: "React, Next.js, TypeScript, Flutter, Firebase, QA Automation, Playwright, Selenium, n8n, Three.js, WebGL",
    },
    knowsAbout: [
      "React", "Next.js", "TypeScript", "Flutter", "Firebase", "QA automation", "Playwright",
      "Selenium", "n8n", "Three.js", "WebGL", "REST APIs", "Tailwind CSS", "FastAPI",
    ],
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: [`${SITE_NAME} Portfolio`, "Zaka Portfolio"],
    description: "The 3D interactive portfolio of Zaka Ullah Waheed, full-stack developer and QA automation engineer from Islamabad, Pakistan.",
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

/** trail: the pages below Home, in order, as [name, path] pairs. */
export function breadcrumbNode(trail: [string, string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...trail.map(([name, path], i) => ({ "@type": "ListItem", position: i + 2, name, item: `${SITE_URL}${path}` })),
    ],
  };
}

/** A light pointer to the person, safe to repeat inside other nodes (author, creator). */
export function personRef() {
  return { "@type": "Person", "@id": PERSON_ID, name: SITE_NAME, url: SITE_URL };
}
