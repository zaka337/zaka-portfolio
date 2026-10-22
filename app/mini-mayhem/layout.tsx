import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "MINI MAYHEM: a 3D racing game (tiny cars, massive egos)",
  description:
    "A playable 3D arcade racing game built into Zaka's portfolio: four tiny cars with giant cartoon heads race three laps around a military-base island and its long suspension bridge. Keyboard and touch controls.",
  alternates: { canonical: `${SITE_URL}/mini-mayhem` },
  openGraph: {
    title: "MINI MAYHEM: tiny cars, massive egos",
    description: "A playable 3D racing game in the browser. Four tiny cars, giant cartoon heads, one island.",
    url: `${SITE_URL}/mini-mayhem`,
    images: [{ url: "/mini-mayhem-preview.jpg", width: 1200, height: 630, alt: "MINI MAYHEM, a 3D racing game" }],
  },
};

export default function MayhemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
