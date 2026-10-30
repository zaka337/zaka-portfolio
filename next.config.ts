import type { NextConfig } from "next";

/* Security headers for every page. The site loads nothing from other servers (no CDN fonts or
   scripts), so the policy can be tight: everything comes from the site itself. 'unsafe-inline'
   is needed for the inline scripts and styles Next.js and the theme switch write into the page;
   'wasm-unsafe-eval' is for the WebAssembly the 3D model decoder and the camera's face tracker
   run; blob: is for textures and the camera preview. The camera, microphone and motion sensors are
   allowed for this site only, because the hidden features use them. Production only: the
   development server needs eval, which this policy would block.

   The one exception: when the game's ad space is switched on (the two NEXT_PUBLIC_ADS_* settings, lib/ads.ts), the
   MINI MAYHEM page alone also lets Google's ad servers in. Every other page keeps the strict policy. Nothing else
   about the policy changes, and with the settings missing nothing changes at all. */
const adsOn = /^ca-pub-\d{10,20}$/.test(process.env.NEXT_PUBLIC_ADS_CLIENT ?? "") && /^\d{6,20}$/.test(process.env.NEXT_PUBLIC_ADS_SLOT ?? "");
const AD_HOSTS = [
  "https://pagead2.googlesyndication.com", "https://*.googlesyndication.com", "https://*.google.com", "https://*.googleadservices.com",
  "https://*.doubleclick.net", "https://*.adtrafficquality.google", "https://www.googletagservices.com",
].join(" ");

const securityHeaders = (ads: boolean) => [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${ads ? " " + AD_HOSTS : ""}`,
          "style-src 'self' 'unsafe-inline'",
          ads ? "img-src 'self' data: blob: https:" : "img-src 'self' data: blob:",
          "font-src 'self' data:",
          `connect-src 'self' data: blob:${ads ? " " + AD_HOSTS : ""}`,
          ...(ads ? [`frame-src ${AD_HOSTS}`] : []),
          "media-src 'self' blob:",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
        ].join("; "),
      }]
    : []),
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // Every page but the game gets the strict policy; the game gets it too unless its ad space is on (see above)
      { source: adsOn ? "/:path((?!mini-mayhem).*)" : "/:path*", headers: securityHeaders(false) },
      ...(adsOn ? [{ source: "/mini-mayhem", headers: securityHeaders(true) }] : []),
      {
        // The service worker (written by scripts/make-sw.mjs): never cached, so a new deploy reaches every visitor
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/Avatar.glb",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/mobile.jpg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // The camera feature's face model and engine: large, never change, and only fetched on demand
        source: "/mediapipe/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000" },
        ],
      },
    ];
  },
};

export default nextConfig;
