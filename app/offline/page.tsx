import type { Metadata } from "next";
import Link from "next/link";
import ScrollUnlock from "@/components/ScrollUnlock";
import "../not-found.css";

/* Shown by the service worker (public/sw.js) when a page is asked for with no connection and no
   saved copy. It is a small copy of the 404 page's look, and it lists the pages that are saved. */
export const metadata: Metadata = {
  title: "You are offline",
  description: "No connection right now. The pages you have opened are saved on this device.",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/resume", label: "Resume" },
  { href: "/tldr", label: "The short version" },
  { href: "/mini-mayhem", label: "Play a game" },
  { href: "/hire", label: "Hire me" },
  { href: "/contact-me", label: "Contact" },
];

export default function Offline() {
  return (
    <main className="nf-root">
      <ScrollUnlock />
      <div className="nf-ghost" aria-hidden="true">OFF</div>
      <div className="nf-content">
        <p className="nf-signal" aria-hidden="true">
          <span className="nf-bars"><i /><i /><i /><i /></span>
          NO CONNECTION
        </p>
        <h1 className="nf-title">
          You are offline,<br />but this still works.
        </h1>
        <p className="nf-sub">
          That page is not saved on this device yet. These are, and they open with no connection:
        </p>
        <nav className="nf-links" aria-label="Saved pages">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <span>{l.label}</span>
              <span aria-hidden="true">{'→'}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
