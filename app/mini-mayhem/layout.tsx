import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode, personRef } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "MINI MAYHEM: 3D racing game",
  description:
    "MINI MAYHEM is a free 3D racing game in your browser by Zaka Ullah Waheed: four tiny cars with giant cartoon heads race three laps around an island.",
  alternates: { canonical: `${SITE_URL}/mini-mayhem` },
  openGraph: {
    title: "MINI MAYHEM: tiny cars, massive egos",
    description: "A playable 3D racing game in the browser. Four tiny cars, giant cartoon heads, one island.",
    url: `${SITE_URL}/mini-mayhem`,
    images: [{ url: "/mini-mayhem-preview.jpg", width: 1200, height: 630, alt: "MINI MAYHEM, a 3D racing game" }],
  },
};

export default function MayhemLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbNode([["MINI MAYHEM", "/mini-mayhem"]]),
          {
            "@type": ["VideoGame", "WebApplication"],
            "@id": `${SITE_URL}/mini-mayhem#game`,
            name: "MINI MAYHEM",
            url: `${SITE_URL}/mini-mayhem`,
            description:
              "A 3D arcade racing game that runs in the browser. Four tiny cars with giant cartoon heads race three laps around a military-base island and its long suspension bridge. Keyboard and touch controls.",
            image: `${SITE_URL}/mini-mayhem-preview.jpg`,
            genre: ["Racing", "Arcade"],
            applicationCategory: "GameApplication",
            operatingSystem: "Any (web browser)",
            gamePlatform: "Web browser",
            playMode: "SinglePlayer",
            inLanguage: "en",
            author: personRef(),
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
        ]}
      />
      {children}
    </>
  );
}
