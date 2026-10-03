import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, QA_ZAKA } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects — QA with Zaka & More",
  description:
    "Explore Zaka Ullah Waheed's projects: QA with Zaka (AI-powered QA platform), Zong Health Scanner, MomCare AI, e-commerce platforms, and mobile apps — built with React, Next.js, Flutter, Firebase, and TypeScript.",
  keywords: [
    "QA with Zaka",
    "QA with Zaka platform",
    "Zaka Ullah Waheed projects",
    "AI QA platform",
    "automated testing Pakistan",
    "Zong health scanner",
    "MomCare AI",
    "React projects",
    "Next.js projects",
    "Flutter apps",
    "full-stack portfolio",
  ],
  alternates: { canonical: `${SITE_URL}/projects` },
  openGraph: {
    title: `QA with Zaka & Projects — ${SITE_NAME}`,
    description:
      "QA with Zaka — AI-powered QA platform by Zaka Ullah Waheed. Plus Zong Health Scanner, MomCare AI, e-commerce & mobile apps. Full-Stack Developer from Pakistan.",
    url: `${SITE_URL}/projects`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `QA with Zaka — ${SITE_NAME} Projects` }],
  },
  twitter: {
    title: `QA with Zaka & Projects — ${SITE_NAME}`,
    description:
      "QA with Zaka — AI-powered QA platform. Zong Scanner, MomCare AI, e-commerce & mobile apps by Zaka Ullah Waheed.",
    images: ["/opengraph-image"],
  },
};

const projectsJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/projects`,
  name: `QA with Zaka & Projects — ${SITE_NAME}`,
  url: `${SITE_URL}/projects`,
  description:
    "A 3D interactive carousel of projects by Zaka Ullah Waheed, featuring QA with Zaka — an AI-powered full-stack educational QA platform — alongside Zong Health Scanner, MomCare AI, and more.",
  author: {
    "@type": "Person",
    name: SITE_NAME,
    url: SITE_URL,
  },
  hasPart: [
    {
      "@type": "SoftwareApplication",
      name: QA_ZAKA.name,
      url: QA_ZAKA.url,
      description: QA_ZAKA.desc,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      author: { "@type": "Person", name: SITE_NAME, url: SITE_URL },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Zong Health Scanner",
      url: SITE_URL,
      description: "n8n-powered telecom website health scanner built for Zong 5G. Automated monitoring with real-time diagnostics.",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      author: { "@type": "Person", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@type": "SoftwareApplication",
      name: "MomCare AI",
      url: SITE_URL,
      description: "AI-powered maternal care backend. Provides personalised health guidance for mothers using machine learning.",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      author: { "@type": "Person", name: SITE_NAME, url: SITE_URL },
    },
  ],
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectsJsonLd) }}
      />
      {children}
    </>
  );
}
