import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";

/* /ur/hire: the Urdu version of /hire. Each version points at the other (hreflang), so search engines show the right one. */
const URL_UR = `${SITE_URL}/ur/hire`;

export const metadata: Metadata = {
  title: { absolute: "Zaka Ullah Waheed کو ہائر کریں | فل اسٹیک اور QA آٹومیشن ڈیولپر" },
  description:
    "Zaka Ullah Waheed کو ہائر کریں: جاب ڈسکرپشن پیسٹ کر کے مطابقت جانچیں، اپنے ٹائم زون میں کال کا وقت تلاش کریں، یا پروجیکٹ کا موٹا تخمینہ لیں۔ ریموٹ کام کے لیے دستیاب۔",
  alternates: {
    canonical: URL_UR,
    languages: { en: `${SITE_URL}/hire`, ur: URL_UR, "x-default": `${SITE_URL}/hire` },
  },
  openGraph: {
    title: `${SITE_NAME} کو ہائر کریں`,
    description: "جاب ڈسکرپشن سے مطابقت جانچیں، اپنے ٹائم زون میں کال کا وقت تلاش کریں، اور پروجیکٹ کی موٹی ٹائم لائن حاصل کریں۔",
    url: URL_UR,
    locale: "ur_PK",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} کو ہائر کریں` }],
  },
};

export default function UrduHireLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbNode([["ہائر کریں", "/ur/hire"]]), { "@type": "WebPage", "@id": URL_UR, url: URL_UR, name: "ہائر کریں", inLanguage: "ur" }]} />
      {children}
    </>
  );
}
