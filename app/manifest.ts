import type { MetadataRoute } from "next";

/* The portfolio as an installable app. "Install" (the address bar on a computer, the menu on Android,
   Share > Add to Home Screen on an iPhone) puts it on the device with its own icon and window, and the
   service worker (public/sw.js, written by scripts/make-sw.mjs after each build) keeps a full copy of
   the site so it also opens with no connection. The icons in public/pwa/ are the "Z." mark; the
   screenshots there are shown by the browser's install sheet. Orientation is not locked: the racing
   game is best sideways on a phone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Zaka Ullah Waheed — Portfolio",
    short_name: "Zaka",
    description:
      "Full-Stack Developer from Pakistan. A 3D portfolio with 28 hidden tricks and a racing game. Works offline.",
    lang: "en",
    dir: "ltr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f1ede2",
    theme_color: "#f1ede2",
    categories: ["portfolio", "developer", "productivity"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Play MINI MAYHEM", short_name: "Play", description: "The 3D racing game", url: "/mini-mayhem", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "The short version", short_name: "TL;DR", description: "The whole portfolio on one screen", url: "/tldr", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Hire me", short_name: "Hire", description: "Job-fit check, call times and project estimate", url: "/hire", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Contact", short_name: "Contact", description: "Start a project brief", url: "/contact-me", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    screenshots: [
      { src: "/pwa/shot-wide-home.jpg", sizes: "1280x720", type: "image/jpeg", form_factor: "wide", label: "The home screen: a 3D face that follows your cursor" },
      { src: "/pwa/shot-wide-game.jpg", sizes: "1280x720", type: "image/jpeg", form_factor: "wide", label: "MINI MAYHEM: a 3D racing game with your own face on the driver" },
      { src: "/pwa/shot-narrow-home.jpg", sizes: "720x1280", type: "image/jpeg", form_factor: "narrow", label: "The home screen on a phone" },
      { src: "/pwa/shot-narrow-game.jpg", sizes: "720x1280", type: "image/jpeg", form_factor: "narrow", label: "Pick a driver in MINI MAYHEM" },
    ],
  };
}
