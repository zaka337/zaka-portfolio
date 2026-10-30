import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { adsEnabled } from "@/lib/ads";
import ScrollUnlock from "@/components/ScrollUnlock";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import "../resume/resume.css";

export const metadata: Metadata = {
  title: { absolute: "Privacy: how this site treats your data | Zaka Ullah Waheed" },
  description:
    "What the portfolio of Zaka Ullah Waheed keeps on your device, what it measures, what happens to a message you send, and how the game's ad space works.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: `Privacy | ${SITE_NAME}`,
    description: "What this site keeps, measures and shares, in plain words.",
    url: `${SITE_URL}/privacy`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Privacy on the portfolio of ${SITE_NAME}` }],
  },
};

/* A plain-language page. Every claim here is about what the code does (the cookie-free analytics in app/layout.tsx,
   the contact route, the camera feature, the voice feature, the game's ad space). If any of those change, change this. */
export default function PrivacyPage() {
  return (
    <div className="rs-page">
      <ScrollUnlock />
      <JsonLd data={breadcrumbNode([["Privacy", "/privacy"]])} />

      <div className="rs-toolbar">
        <Link href="/">{'←'} Back</Link>
      </div>

      <main className="rs-sheet">
        <header className="rs-head">
          <h1>Privacy</h1>
          <p className="rs-title">How this site treats your data, in plain words.</p>
          <p className="rs-contact"><span>Last updated 31 October 2026</span></p>
        </header>

        <section>
          <h2>The short version</h2>
          <p>
            There is no account, no sign-in and no sign-up. The site itself sets no cookies. It counts visits without
            following you around the web, it never sells or shares anything about you, and the camera feature never
            leaves your device.{" "}
            {adsEnabled
              ? "The one exception is the ad in the MINI MAYHEM game, explained below."
              : "The game has an ad space that is switched off right now; what it would mean is explained below."}
          </p>
        </section>

        <section>
          <h2>What stays on your device</h2>
          <p>
            Your choices (dark mode, the reading options, sound on or off), the hidden things you have found and your best race
            time are kept in your browser&apos;s own storage so they are there next time. That storage is on your device only.
            Clearing your browser&apos;s site data removes it.
          </p>
        </section>

        <section>
          <h2>What is measured</h2>
          <p>
            The site uses Vercel Web Analytics to count visits. It records things like which page was opened, roughly where in the
            world and on what kind of device, without cookies and without a profile of you. It is not used for advertising.
          </p>
        </section>

        <section>
          <h2>A message you send</h2>
          <p>
            The project brief form sends what you type to me by email, through a service called Resend. The site does not keep a copy.
            The WhatsApp button only opens WhatsApp with a message ready to send; nothing is sent until you send it there.
          </p>
        </section>

        <section>
          <h2>Camera and voice</h2>
          <p>
            The camera feature (the head that copies you) runs entirely in your browser: the picture is not recorded or uploaded.
            If you use the voice commands, your browser&apos;s own speech service may process what you say; that is done by your
            browser, not by this site.
          </p>
        </section>

        <section>
          <h2>Ads in the game</h2>
          <p>
            {adsEnabled
              ? "The MINI MAYHEM game shows one small ad on its title screen and its results screen, never while you race. It comes from Google AdSense, which may use cookies and similar identifiers to choose and measure the ad. In the EU, the EEA, the UK and Switzerland, nothing from Google is loaded until you press Allow ads; No thanks is remembered. Everywhere else the ad loads straight away. You can change your mind by clearing this site's data in your browser, and you can manage Google's ad settings at "
              : "The MINI MAYHEM game has an ad space that is switched off right now, so nothing from any ad company is loaded. If it is switched on, it would be one small ad on the title and results screens, never while you race, from Google AdSense, which may use cookies and similar identifiers. In the EU, the EEA, the UK and Switzerland it would load only after you press Allow ads. Google's ad settings are at "}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.
          </p>
        </section>

        <section>
          <h2>Where the site runs</h2>
          <p>
            The site is hosted on Vercel. Like any web host, its servers see technical details of each request (such as your IP
            address) in order to deliver the page and keep it secure.
          </p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>
            Ask me through the <Link href="/contact-me">contact page</Link>. If this page ever changes in a way that matters, the date at the top changes too.
          </p>
        </section>
      </main>
    </div>
  );
}
