import type { NextConfig } from "next";

/* Security headers for every page. The site loads nothing from other servers (no CDN fonts or
   scripts), so the policy can be tight: everything comes from the site itself. 'unsafe-inline'
   is needed for the inline scripts and styles Next.js and the theme switch write into the page;
   'wasm-unsafe-eval' is for the WebAssembly the 3D model decoder and the camera's face tracker
   run; blob: is for textures and the camera preview. The camera, microphone and motion sensors are
   allowed for this site only, because the hidden features use them. Production only: the
   development server needs eval, which this policy would block. */
const security = [
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
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self' data: blob:",
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
      { source: "/:path*", headers: security },
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
