import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PROJECTS } from "@/lib/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL,                   lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${SITE_URL}/about`,        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/projects`,     lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${SITE_URL}/projects/all`,    lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${SITE_URL}/resume`,       lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/hire`,         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/tldr`,         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/qa-challenge`, lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${SITE_URL}/contact-me`,   lastModified: now, changeFrequency: "yearly",  priority: 0.8 },
    { url: `${SITE_URL}/contact`,      lastModified: now, changeFrequency: "yearly",  priority: 0.7 },
    ...PROJECTS.map((p) => ({ url: `${SITE_URL}/projects/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
