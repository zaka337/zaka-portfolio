import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode, personNode, LAST_UPDATED, WEBSITE_ID } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import "./about.css";

export const metadata: Metadata = {
  title: { absolute: "About Zaka Ullah Waheed | Full-Stack Developer, Islamabad" },
  description:
    "About Zaka Ullah Waheed: a full-stack developer and QA automation engineer from Islamabad. His story, toolkit and journey from first HTML to production apps.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About ${SITE_NAME} — 3D Portfolio Developer`,
    description:
      "Full-stack developer from Pakistan and creator of this 3D interactive portfolio. React, Next.js, Three.js, Flutter, QA automation. Interned at Zong 5G. Open to remote work.",
    url: `${SITE_URL}/about`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `About ${SITE_NAME}` }],
  },
  twitter: {
    title: `About ${SITE_NAME} — 3D Portfolio Developer`,
    description:
      "Full-stack developer from Pakistan. 3D interactive portfolio with Three.js, React, Next.js, Flutter, QA automation.",
    images: ["/opengraph-image"],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([["About", "/about"]]),
          {
            "@type": "ProfilePage",
            "@id": `${SITE_URL}/about#profile`,
            url: `${SITE_URL}/about`,
            name: `About ${SITE_NAME}`,
            dateModified: LAST_UPDATED,
            inLanguage: "en",
            isPartOf: { "@id": WEBSITE_ID },
            mainEntity: personNode(),
          },
        ]}
      />
      {children}
    </>
  );
}
