import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "TL;DR: Zaka Ullah Waheed in one screen" },
  description:
    "Zaka Ullah Waheed in one screen: what he does, three projects worth opening and how to work with him. Full-stack developer, QA mindset, open to remote.",
  alternates: { canonical: `${SITE_URL}/tldr` },
  openGraph: {
    title: `${SITE_NAME}: the short version`,
    description: "What he does, three projects worth opening, and how to work with him. One screen.",
    url: `${SITE_URL}/tldr`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: the short version` }],
  },
};

export default function TldrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbNode([["The short version", "/tldr"]])} />
      {children}
    </>
  );
}
