import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zaka Ullah Waheed — Portfolio",
    short_name: "Zaka",
    description:
      "Full-Stack Developer from Pakistan. React, Next.js, Flutter, QA Automation.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1ede2",
    theme_color: "#0d0d0d",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
