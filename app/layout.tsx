import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./ClientProviders";
import { SITE_URL, SITE_NAME, SOCIAL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Zaka Ullah Waheed — Full-Stack Developer Portfolio",
    template: "%s | Zaka Ullah Waheed Portfolio",
  },
  description:
    "Zaka Ullah Waheed's developer portfolio — Full-Stack Developer from Pakistan building production-grade web apps, mobile apps, and QA automation with React, Next.js, Flutter, and TypeScript. Open to remote work.",
  keywords: [
    "Zaka Ullah Waheed",
    "Zaka portfolio",
    "Zaka developer portfolio",
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
    title: "Zaka Ullah Waheed — Full-Stack Developer Portfolio",
    description:
      "Zaka Ullah Waheed's portfolio — Full-Stack Developer from Pakistan. React, Next.js, Flutter, QA Automation. Open to remote work.",
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
    title: "Zaka Ullah Waheed — Full-Stack Developer Portfolio",
    description:
      "Zaka Ullah Waheed's portfolio — Full-Stack Developer from Pakistan. React, Next.js, Flutter, QA Automation. Open to remote work.",
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
      name: `${SITE_NAME} Portfolio`,
      description:
        "Zaka Ullah Waheed's developer portfolio — Full-Stack Developer from Pakistan specialising in React, Next.js, Flutter, and QA Automation.",
      inLanguage: "en-PK",
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
        "Full-Stack Developer specialising in React, Next.js, Flutter, and QA Automation. Based in Pakistan, open to remote work.",
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
        "REST APIs",
        "Tailwind CSS",
      ],
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "University",
        addressCountry: "PK",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
