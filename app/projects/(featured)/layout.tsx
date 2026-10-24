import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode, personRef } from "@/lib/seo";
import { SITE_URL, SITE_NAME, QA_ZAKA } from "@/lib/site";
import "./projects.css";

export const metadata: Metadata = {
  title: "Projects — QA with Zaka & More",
  description:
    "Projects by Zaka Ullah Waheed: QA with Zaka, Zong Health Scanner, MomCare AI, GlamourHub and BazaarBox. React, Next.js, Flutter, Python and Playwright.",
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
      "QA with Zaka — QA automation learning platform by Zaka Ullah Waheed. Plus Zong Health Scanner, MomCare AI, e-commerce & mobile apps. Full-Stack Developer from Pakistan.",
    url: `${SITE_URL}/projects`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `QA with Zaka — ${SITE_NAME} Projects` }],
  },
  twitter: {
    title: `QA with Zaka & Projects — ${SITE_NAME}`,
    description:
      "QA with Zaka — QA automation learning platform. Zong Scanner, MomCare AI, e-commerce & mobile apps by Zaka Ullah Waheed.",
    images: ["/opengraph-image"],
  },
};

const projectsJsonLd = {
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/projects`,
  name: `QA with Zaka & Projects — ${SITE_NAME}`,
  url: `${SITE_URL}/projects`,
  description:
    "Featured projects by Zaka Ullah Waheed, each with its own case study, including QA with Zaka — a full-stack QA automation learning platform — alongside Zong Health Scanner, MomCare AI, and more.",
  author: personRef(),
  hasPart: [
    {
      "@type": "SoftwareApplication",
      name: QA_ZAKA.name,
      url: QA_ZAKA.url,
      description: QA_ZAKA.desc,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      author: personRef(),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Zong Health Scanner",
      url: `${SITE_URL}/projects/zong-health-scanner`,
      description: "n8n-powered telecom website health scanner built for Zong 5G. Automated monitoring with real-time diagnostics.",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      author: personRef(),
    },
    {
      "@type": "SoftwareApplication",
      name: "MomCare AI",
      url: `${SITE_URL}/projects/momcare-ai`,
      description: "Machine-learning backend that predicts maternal health risk (low, mid or high) from a patient's vitals, lifestyle and background.",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      author: personRef(),
    },
  ],
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbNode([["Projects", "/projects"]]), projectsJsonLd]} />
      {children}
    </>
  );
}
