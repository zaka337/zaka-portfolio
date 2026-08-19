import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./ClientProviders";
import { SITE_URL, SITE_NAME, SOCIAL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Zaka Ullah Waheed — Full-Stack Developer",
    template: "%s | Zaka Ullah Waheed",
  },
  description:
    "Full-Stack Developer from Pakistan building production-grade web apps, mobile apps, and QA automation systems with React, Next.js, Flutter, and TypeScript. Open to remote work.",
  keywords: [
    "Full-Stack Developer Pakistan",
    "React Developer",
    "Next.js Developer",
    "Flutter Developer",
    "QA Automation Engineer",
    "TypeScript Developer",
    "Firebase Developer",
    "Zaka Ullah Waheed",
    "hire developer Pakistan",
    "remote developer",
    "freelance developer",
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
    title: "Zaka Ullah Waheed — Full-Stack Developer",
    description:
      "Full-Stack Developer from Pakistan. React, Next.js, Flutter, QA Automation. Open to remote work.",
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
    title: "Zaka Ullah Waheed — Full-Stack Developer",
    description:
      "Full-Stack Developer from Pakistan. React, Next.js, Flutter, QA Automation. Open to remote work.",
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
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description:
        "Portfolio of Zaka Ullah Waheed — Full-Stack Developer from Pakistan",
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
