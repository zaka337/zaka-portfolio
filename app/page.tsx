import type { Metadata } from "next";
import Link from "next/link";
import HomeScreen from "@/components/HomeScreen";
import HomeBuildLoader from "@/components/homebuild/HomeBuildLoader";
import { SITE_URL } from "@/lib/site";
import "@/components/homebuild/build.css";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

/* The multi-cursor build (components/homebuild): the home is assembled by five labelled cursors, the avatar's head is drawn in ink
   while the 3D model builds, then the real head comes in through the sketch. This script decides, before anything is painted, whether
   it plays, so the home never flashes in its final state first:
     - on the first visit of a session (the layout's head script has not added zk-skip), or when the address has ?build (a replay link);
     - never for reduced motion, the site's calm mode, Save-Data, or crawlers and speed testers (they get the finished page at once).
   If the build has not started within 5 seconds for any reason, the page is simply shown as it is. */
const BOOT =
  "try{var d=document.documentElement,w=window,ua=navigator.userAgent||'',forced=/[?&]build(=|&|$)/.test(location.search),first=!d.classList.contains('zk-skip'),mm=w.matchMedia,rm=mm&&mm('(prefers-reduced-motion: reduce)').matches,save=navigator.connection&&navigator.connection.saveData,bot=/bot|crawl|spider|slurp|lighthouse|pagespeed|gtmetrix|pingdom|prerender/i.test(ua);" +
  "if(!rm&&!d.hasAttribute('data-calm')&&(forced||(first&&!save&&!bot))){w.__zbArmed=true;d.classList.add('zb');if(forced)d.classList.add('zk-skip');" +
  "setTimeout(function(){if(!d.classList.contains('zb-live')&&!d.classList.contains('zb-done')){d.classList.remove('zb')}},5000)}}catch(e){}";

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <HomeScreen />
      <HomeBuildLoader />
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
