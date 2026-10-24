import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import "./contact-me.css";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Let's Work Together",
  description:
    "Contact Zaka Ullah Waheed, a full-stack developer open to remote and freelance work. Start a project brief or reach out by email, LinkedIn or GitHub.",
  alternates: { canonical: `${SITE_URL}/contact-me` },
  openGraph: {
    title: `Let's Work — ${SITE_NAME}`,
    description:
      "Full-stack developer open to remote freelance. Email, LinkedIn, GitHub, Instagram.",
    url: `${SITE_URL}/contact-me`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Let's Work — ${SITE_NAME}` }],
  },
  twitter: {
    title: `Let's Work — ${SITE_NAME}`,
    description:
      "Full-stack developer open to remote freelance. Reach out anytime.",
    images: ["/opengraph-image"],
  },
};

export default function ContactMeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbNode([["Contact", "/contact-me"]])} />
      {children}
    </>
  );
}
