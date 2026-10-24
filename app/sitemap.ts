import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PROJECTS } from "@/lib/projects";
import { LAST_UPDATED } from "@/lib/seo";

/* lastModified is a fixed date (lib/seo.ts LAST_UPDATED), bumped when the content really changes.
   It used to be "now", which tells a crawler every page changed on every visit, so it learns to ignore it. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(LAST_UPDATED);
  const page = (path: string, changeFrequency: "weekly" | "monthly" | "yearly", priority: number) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    page("", "monthly", 1.0),
    page("/about", "monthly", 0.9),
    page("/projects", "weekly", 0.85),
    ...PROJECTS.map((p) => page(`/projects/${p.slug}`, "monthly", 0.8)),
    page("/resume", "monthly", 0.8),
    page("/hire", "monthly", 0.8),
    page("/tldr", "monthly", 0.8),
    page("/contact-me", "yearly", 0.8),
    page("/mini-mayhem", "monthly", 0.7),
    page("/contact", "yearly", 0.6),
    page("/qa-challenge", "yearly", 0.6),
    page("/projects/all", "weekly", 0.6),
  ];
}
