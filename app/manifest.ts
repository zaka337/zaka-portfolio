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
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
