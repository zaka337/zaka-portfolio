import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL,                   lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${SITE_URL}/about`,        lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/projects`,     lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${SITE_URL}/contact-me`,   lastModified: now, changeFrequency: "yearly",  priority: 0.8 },
    { url: `${SITE_URL}/contact`,      lastModified: now, changeFrequency: "yearly",  priority: 0.7 },
  ];
}
