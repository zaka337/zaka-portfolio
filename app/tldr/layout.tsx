import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "TL;DR: Zaka Ullah Waheed in one screen",
  description:
    "The short version of Zaka Ullah Waheed: a full-stack developer with a QA mindset. What he does, three projects worth opening, and how to work with him. Open to remote work.",
  alternates: { canonical: `${SITE_URL}/tldr` },
  openGraph: {
    title: `${SITE_NAME}: the short version`,
    description: "What he does, three projects worth opening, and how to work with him. One screen.",
    url: `${SITE_URL}/tldr`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: the short version` }],
  },
};

export default function TldrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
