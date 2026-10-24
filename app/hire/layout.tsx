import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Hire Zaka Ullah Waheed | Full-Stack & QA Automation Developer" },
  description:
    "Hire Zaka Ullah Waheed: paste a job description to check the fit, find a call time in your time zone, or get a rough project estimate. Open to remote work.",
  alternates: { canonical: `${SITE_URL}/hire` },
  openGraph: {
    title: `Hire ${SITE_NAME}`,
    description: "Check the fit with a job description, find a call time in your time zone, and get a rough project timeline.",
    url: `${SITE_URL}/hire`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Hire ${SITE_NAME}` }],
  },
};

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbNode([["Hire", "/hire"]])} />
      {children}
    </>
  );
}
