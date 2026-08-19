import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Zaka Ullah Waheed — full-stack developer from Pakistan with hands-on experience in React, Next.js, Flutter, TypeScript, Firebase, and QA automation. Interned at Zong 5G. Building production apps since 2024.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About ${SITE_NAME}`,
    description:
      "Full-stack developer from Pakistan. React, Next.js, Flutter, QA automation. Interned at Zong 5G. Open to remote work.",
    url: `${SITE_URL}/about`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `About ${SITE_NAME}` }],
  },
  twitter: {
    title: `About ${SITE_NAME}`,
    description:
      "Full-stack developer from Pakistan. React, Next.js, Flutter, QA automation.",
    images: ["/opengraph-image"],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
