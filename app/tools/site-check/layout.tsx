import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode, personRef } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Title near 60 characters, description under 160 (longer is cut off in search results).
const TITLE = "Free Website Health Check: Security, SEO";
const DESC = "Paste a web address and get a score and a fix for each problem: security headers, SEO, speed, accessibility and links. 35 checks, free, nothing stored.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | ${SITE_NAME}` },
  description: DESC,
  alternates: { canonical: `${SITE_URL}/tools/site-check` },
  openGraph: {
    title: "Free Website Health Check",
    description: "35 automatic checks of security headers, SEO, performance, accessibility and links, with a fix for each problem.",
    url: `${SITE_URL}/tools/site-check`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Free website health check by Zaka Ullah Waheed" }],
  },
};

export default function SiteCheckLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([["Site health check", "/tools/site-check"]]),
          {
            "@type": "WebApplication",
            name: "Website health check",
            url: `${SITE_URL}/tools/site-check`,
            description: DESC,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any (runs in the browser)",
            browserRequirements: "Requires JavaScript",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            author: personRef(),
          },
        ]}
      />
      {children}
    </>
  );
}
