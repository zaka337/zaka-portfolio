import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore Zaka Ullah Waheed's 3D interactive portfolio projects — QA automation tools, AI-powered apps, e-commerce platforms, and mobile apps built with React, Next.js, Flutter, Three.js, Firebase, and TypeScript.",
  alternates: { canonical: `${SITE_URL}/projects` },
  openGraph: {
    title: `Projects — ${SITE_NAME} | 3D Interactive Portfolio`,
    description:
      "Projects from Zaka's 3D interactive portfolio — QA automation tools, AI apps, e-commerce platforms, and mobile apps. React, Next.js, Flutter, Firebase.",
    url: `${SITE_URL}/projects`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Projects — ${SITE_NAME}` }],
  },
  twitter: {
    title: `Projects — ${SITE_NAME} | 3D Interactive Portfolio`,
    description:
      "QA tools, AI apps, e-commerce and mobile apps from Zaka's 3D interactive developer portfolio. React, Next.js, Flutter.",
    images: ["/opengraph-image"],
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
