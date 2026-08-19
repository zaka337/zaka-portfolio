import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Zaka Ullah Waheed. Available for full-stack development, QA automation, and freelance projects. Based in Pakistan, open to remote collaboration worldwide.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: `Contact ${SITE_NAME}`,
    description:
      "Available for full-stack development and QA automation. Based in Pakistan, open to remote.",
    url: `${SITE_URL}/contact`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Contact ${SITE_NAME}` }],
  },
  twitter: {
    title: `Contact ${SITE_NAME}`,
    description:
      "Available for full-stack development and QA automation. Open to remote.",
    images: ["/opengraph-image"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
