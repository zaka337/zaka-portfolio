import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ClientProviders from "./ClientProviders";
import ThemeToggle from "@/components/ThemeToggle";
import JsonLd from "@/components/JsonLd";
import { personNode, websiteNode } from "@/lib/seo";
import { SITE_URL, SITE_NAME, SOCIAL } from "@/lib/site";

export const viewport: Viewport = {
  // Light is the default theme for every visitor, so the browser chrome matches it.
  themeColor: "#f1ede2",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Zaka Ullah Waheed | Full-Stack Developer & QA Automation",
    template: "%s | Zaka Ullah Waheed Portfolio",
  },
  description:
    "Zaka Ullah Waheed is a full-stack developer and QA automation engineer from Islamabad, Pakistan. Explore his 3D portfolio, projects, resume and racing game.",
  keywords: [
    "Zaka Ullah Waheed",
    "Zaka portfolio",
    "Zaka developer portfolio",
    "3D portfolio",
    "3D interactive portfolio",
    "3D developer portfolio",
    "WebGL portfolio",
    "Three.js portfolio",
    "interactive portfolio",
    "interactive developer portfolio",
    "3D portfolio website",
    "creative developer portfolio",
    "Full-Stack Developer Pakistan",
    "React Developer portfolio",
    "Next.js Developer",
    "Flutter Developer",
    "QA Automation Engineer",
    "TypeScript Developer",
    "Firebase Developer",
    "hire developer Pakistan",
    "remote developer portfolio",
    "freelance developer Pakistan",
    "n8n workflows",
    "Selenium testing",
    "QA with Zaka",
    "QA with Zaka platform",
    "QA_with_ZAKA",
    "Zaka QA platform",
    "AI QA platform Pakistan",
    "automated testing platform",
  ],
  applicationName: "Zaka",
  // Added to an iPhone or iPad Home Screen, it opens as its own app (the icon is app/apple-icon.tsx)
  appleWebApp: { capable: true, title: "Zaka", statusBarStyle: "default" },
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Zaka Ullah Waheed | Full-Stack Developer & QA Automation",
    description:
      "3D interactive portfolio of Zaka Ullah Waheed, full-stack developer and QA automation engineer from Pakistan. React, Next.js, Flutter, Playwright. Open to remote work.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Zaka Ullah Waheed — Full-Stack Developer",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Zaka Ullah Waheed | Full-Stack Developer & QA Automation",
    description:
      "3D interactive portfolio of Zaka Ullah Waheed, full-stack developer and QA automation engineer from Pakistan. Open to remote work.",
    images: ["/opengraph-image"],
    creator: "@notxzaka",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // No canonical here: a page without its own would claim to be the home page. The home page sets its own (app/page.tsx).

  verification: {
    google: "DKB_MhzU-pvDYGsvo2EjCQA0mimMBQFvWqICbRasY1Q",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PK" suppressHydrationWarning>
      <head>
        {/* Apply the saved (else system) theme before first paint so there is no flash */}
        <script dangerouslySetInnerHTML={{ __html: `var t='light';try{if(localStorage.getItem('zk-theme')==='dark')t='dark'}catch(e){}document.documentElement.setAttribute('data-theme',t)` }} />
        {/* The reading and access choices (components/Access.tsx), applied before first paint.
            Calm mode also makes every "prefers reduced motion" check on the site answer yes. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var a=JSON.parse(localStorage.getItem('zk-a11y')||'{}'),h=document.documentElement;if(a.text>0&&a.text<4)h.setAttribute('data-text',String(a.text));if(a.easy)h.setAttribute('data-easy','');if(a.contrast)h.setAttribute('data-contrast','');if(a.calm){h.setAttribute('data-calm','');var mm=window.matchMedia;window.matchMedia=function(q){var r=mm.call(window,q);if(q.indexOf('prefers-reduced-motion')>-1){return{matches:q.indexOf('no-preference')<0,media:q,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false}}}return r}}}catch(e){}` }} />
        {/* Hide loader immediately if already shown this session (prevents re-show on back nav) */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem('zk-shown'))document.documentElement.classList.add('zk-skip');}catch(e){}` }} />
        {/* Preload the 3D avatar so the browser fetches it immediately on HTML parse,
            before JS hydrates — cuts perceived load time significantly */}
        <link rel="preload" href="/Avatar.glb" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.github.com" />
        <meta name="google-site-verification" content="DKB_MhzU-pvDYGsvo2EjCQA0mimMBQFvWqICbRasY1Q" />
        {/* rel="me" — social identity proof for Google's Knowledge Graph */}
        <link rel="me" href={SOCIAL.github} />
        <link rel="me" href={SOCIAL.linkedin} />
        <link rel="me" href={SOCIAL.instagram} />
        <link rel="me" href={`mailto:${SOCIAL.email}`} />
        <JsonLd data={[websiteNode(), personNode()]} />
      </head>
      <body>
        {/* Loading screen — shown before React hydrates, dismissed when GLB loads */}
        <div id="zk-loader" aria-hidden="true">
          <span className="zk-wordmark">ZAKA.</span>
          <div className="zk-bar-track">
            <div className="zk-bar-fill" />
          </div>
        </div>
        <ClientProviders>{children}</ClientProviders>
        {/* Cookie-free page-view analytics (Vercel Web Analytics) */}
        <ThemeToggle />
        <Analytics />
      </body>
    </html>
  );
}
