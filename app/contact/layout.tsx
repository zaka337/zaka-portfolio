import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import "./nokia.css";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Contact Zaka Ullah Waheed | Full-Stack Developer" },
  description:
    "Get in touch with Zaka Ullah Waheed on a working Nokia 3310, or by email and LinkedIn. Full-stack development and QA automation, open to remote work.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: `Contact ${SITE_NAME}`,
    description:
      "Available for full-stack development and QA automation. Based in Pakistan, open to remote.",
    url: `${SITE_URL}/contact`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Contact ${SITE_NAME}` }],
  },
  twitter: {
    title: `Contact ${SITE_NAME}`,
    description:
      "Available for full-stack development and QA automation. Open to remote.",
    images: ["/opengraph-image"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbNode([["Contact", "/contact"]])} />
      {children}
    </>
  );
}
