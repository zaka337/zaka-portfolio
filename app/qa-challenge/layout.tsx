import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "QA Challenge: break this checkout | Zaka Ullah Waheed" },
  description:
    "Break this checkout: six bugs are hidden in a made-up shop. Test it like a QA engineer, then see the Playwright check that would catch each one.",
  alternates: { canonical: `${SITE_URL}/qa-challenge` },
  openGraph: {
    title: `QA challenge: break this checkout | ${SITE_NAME}`,
    description: "Six bugs are hidden in this checkout. Can you find them all?",
    url: `${SITE_URL}/qa-challenge`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "QA challenge: break this checkout" }],
  },
};

export default function QaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbNode([["QA challenge", "/qa-challenge"]])} />
      {children}
    </>
  );
}
