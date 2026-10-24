import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "All GitHub Repositories",
  description:
    "Every public GitHub repository by Zaka Ullah Waheed in an interactive 3D carousel: web, mobile, AI, automation and DevOps projects.",
  alternates: { canonical: `${SITE_URL}/projects/all` },
};

export default function AllProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbNode([["Projects", "/projects"], ["All repositories", "/projects/all"]])} />
      {children}
    </>
  );
}
