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
    // the two pages that also exist in Urdu: each entry names its other-language twin (hreflang)
    ...(["hire", "tldr"] as const).flatMap((slug) => [
      { ...page(`/${slug}`, "monthly", 0.8), alternates: { languages: { en: `${SITE_URL}/${slug}`, ur: `${SITE_URL}/ur/${slug}` } } },
      { ...page(`/ur/${slug}`, "monthly", 0.7), alternates: { languages: { en: `${SITE_URL}/${slug}`, ur: `${SITE_URL}/ur/${slug}` } } },
    ]),
    page("/services", "monthly", 0.8),
    page("/tools/site-check", "monthly", 0.7),
    page("/tools/llmcheck", "monthly", 0.7),
    page("/contact-me", "yearly", 0.8),
    page("/mini-mayhem", "monthly", 0.7),
    page("/contact", "yearly", 0.6),
    page("/qa-challenge", "yearly", 0.6),
    page("/projects/all", "weekly", 0.6),
    page("/privacy", "yearly", 0.3),
  ];
}
