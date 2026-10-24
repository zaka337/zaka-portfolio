import type { Metadata } from "next";
import Link from "next/link";
import HomeScreen from "@/components/HomeScreen";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default function Home() {
  return (
    <>
      <HomeScreen />
      {/* The same facts as the site, as plain text. Always in the page for crawlers, readers and screen
          readers (it is not aria-hidden), but out of sight because the home screen is made of big type.
          Keep it true and short: whatever is written here must also be said somewhere visible. */}
      <section className="sr-only" aria-label="About Zaka Ullah Waheed">
        <h2>Zaka Ullah Waheed: full-stack developer and QA automation engineer</h2>
        <p>
          Zaka Ullah Waheed is a full-stack developer and QA automation engineer from Islamabad, Pakistan. He builds web apps
          with React, Next.js and TypeScript, mobile apps with Flutter, and automated tests with Playwright. He created QA with
          Zaka, a QA automation learning platform, and built a website health scanner during his QA automation internship at
          Zong 5G. He is open to remote work.
        </p>
        <nav aria-label="More pages">
          <Link href="/about" tabIndex={-1}>About Zaka Ullah Waheed</Link>
          <Link href="/projects" tabIndex={-1}>Projects</Link>
          <Link href="/resume" tabIndex={-1}>Resume</Link>
          <Link href="/tldr" tabIndex={-1}>The short version</Link>
          <Link href="/hire" tabIndex={-1}>Hire Zaka</Link>
          <Link href="/qa-challenge" tabIndex={-1}>QA challenge</Link>
          <Link href="/mini-mayhem" tabIndex={-1}>MINI MAYHEM, a 3D racing game</Link>
          <Link href="/contact-me" tabIndex={-1}>Contact</Link>
        </nav>
      </section>
    </>
  );
}
