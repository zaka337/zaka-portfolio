import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "All Repositories",
  description:
    "Every public repository by Zaka Ullah Waheed in an interactive 3D carousel — web, mobile, AI, automation and DevOps projects.",
  alternates: { canonical: `${SITE_URL}/projects/all` },
};

export default function AllProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
