import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";

/* /ur/tldr: the Urdu version of /tldr. Each version points at the other (hreflang), so search engines show the right one. */
const URL_UR = `${SITE_URL}/ur/tldr`;

export const metadata: Metadata = {
  title: { absolute: "مختصر تعارف: Zaka Ullah Waheed ایک اسکرین میں" },
  description:
    "Zaka Ullah Waheed ایک اسکرین میں: وہ کیا کرتا ہے، تین پروجیکٹس جو پہلے دیکھنے چاہییں، اور اس کے ساتھ کام کیسے کریں۔ فل اسٹیک ڈیولپر، QA کی سوچ، ریموٹ کام کے لیے دستیاب۔",
  alternates: {
    canonical: URL_UR,
    languages: { en: `${SITE_URL}/tldr`, ur: URL_UR, "x-default": `${SITE_URL}/tldr` },
  },
  openGraph: {
    title: `${SITE_NAME}: مختصر تعارف`,
    description: "وہ کیا کرتا ہے، تین پروجیکٹس جو پہلے دیکھنے چاہییں، اور اس کے ساتھ کام کیسے کریں۔ ایک اسکرین میں۔",
    url: URL_UR,
    locale: "ur_PK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: مختصر تعارف` }],
  },
};

export default function UrduTldrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbNode([["مختصر تعارف", "/ur/tldr"]]), { "@type": "WebPage", "@id": URL_UR, url: URL_UR, name: "مختصر تعارف", inLanguage: "ur" }]} />
      {children}
    </>
  );
}
