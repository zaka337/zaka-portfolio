import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "QA challenge: break this checkout",
  description:
    "A small made-up shop checkout with six bugs hidden in it. Test it like a QA engineer, find the bugs, and see the Playwright check that would have caught each one. Built by Zaka Ullah Waheed, creator of QA with Zaka.",
  alternates: { canonical: `${SITE_URL}/qa-challenge` },
  openGraph: {
    title: `QA challenge: break this checkout | ${SITE_NAME}`,
    description: "Six bugs are hidden in this checkout. Can you find them all?",
    url: `${SITE_URL}/qa-challenge`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "QA challenge: break this checkout" }],
  },
};

export default function QaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
