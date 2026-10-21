import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hire Zaka: job-fit check, book a call, project estimate",
  description:
    "Thinking of working with Zaka Ullah Waheed? Paste a job description to see how his skills match, find a call time in your own time zone, or get a rough timeline for your project. Open to remote work.",
  alternates: { canonical: `${SITE_URL}/hire` },
  openGraph: {
    title: `Hire ${SITE_NAME}`,
    description: "Check the fit with a job description, find a call time in your time zone, and get a rough project timeline.",
    url: `${SITE_URL}/hire`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Hire ${SITE_NAME}` }],
  },
};

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
