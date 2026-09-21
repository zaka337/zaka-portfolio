import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./ClientProviders";
import { SITE_URL, SITE_NAME, SOCIAL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Zaka Ullah Waheed — Full-Stack Developer | 3D Interactive Portfolio",
    template: "%s | Zaka Ullah Waheed Portfolio",
  },
  description:
    "Zaka Ullah Waheed's 3D interactive developer portfolio — Full-Stack Developer from Pakistan featuring a live WebGL avatar built with Three.js. Building production-grade web apps, mobile apps, and QA automation with React, Next.js, Flutter, and TypeScript. Open to remote work.",
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
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",

  openGraph: {
    type: "website",
    locale: "en_PK",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Zaka Ullah Waheed — Full-Stack Developer | 3D Interactive Portfolio",
    description:
      "Zaka Ullah Waheed's 3D interactive portfolio — Full-Stack Developer from Pakistan. Live WebGL avatar, Three.js, React, Next.js, Flutter, QA Automation. Open to remote work.",
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
    title: "Zaka Ullah Waheed — Full-Stack Developer | 3D Interactive Portfolio",
    description:
      "Zaka Ullah Waheed's 3D interactive portfolio — Full-Stack Developer from Pakistan. Live WebGL avatar, React, Next.js, Flutter, QA Automation. Open to remote work.",
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

  alternates: {
    canonical: SITE_URL,
  },

  verification: {
    google: "DKB_MhzU-pvDYGsvo2EjCQA0mimMBQFvWqICbRasY1Q",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: `${SITE_NAME} — 3D Interactive Portfolio`,
      description:
        "Zaka Ullah Waheed's 3D interactive developer portfolio — Full-Stack Developer from Pakistan featuring a live WebGL avatar built with Three.js. Specialising in React, Next.js, Flutter, and QA Automation.",
      inLanguage: "en-PK",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/projects` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      url: SITE_URL,
      image: {
        "@type": "ImageObject",
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
      },
      sameAs: [SOCIAL.github, SOCIAL.linkedin, SOCIAL.instagram],
      jobTitle: "Full-Stack Developer",
      description:
        "Full-Stack Developer specialising in React, Next.js, Flutter, and QA Automation. Based in Pakistan, open to remote work. Creator of a 3D interactive developer portfolio featuring a live WebGL avatar.",
      email: SOCIAL.email,
      address: {
        "@type": "PostalAddress",
        addressCountry: "PK",
      },
      knowsAbout: [
        "React.js",
        "Next.js",
        "TypeScript",
        "Flutter",
        "Firebase",
        "QA Automation",
        "Selenium",
        "n8n",
        "Three.js",
        "WebGL",
        "REST APIs",
        "Tailwind CSS",
      ],
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "University",
        addressCountry: "PK",
      },
    },
    {
      "@type": "CreativeWork",
      "@id": `${SITE_URL}/#portfolio`,
      name: "Zaka Ullah Waheed — 3D Interactive Developer Portfolio",
      url: SITE_URL,
      author: { "@id": `${SITE_URL}/#person` },
      description:
        "A 3D interactive developer portfolio featuring a real-time WebGL avatar that tracks mouse movement, built with Three.js, React, and Next.js. Showcases full-stack development projects, mobile apps, and QA automation work.",
      keywords: "3D portfolio, WebGL, Three.js, interactive portfolio, full-stack developer, React, Next.js",
      inLanguage: "en-PK",
      about: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="DKB_MhzU-pvDYGsvo2EjCQA0mimMBQFvWqICbRasY1Q" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
