import type { Metadata } from "next";
import Link from "next/link";
import ScrollUnlock from "@/components/ScrollUnlock";
import "./not-found.css";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page could not be found. Head back to the portfolio of Zaka Ullah Waheed.",
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

export default function NotFound() {
  return (
    <main className="nf-root">
      <ScrollUnlock />
      <div className="nf-ghost" aria-hidden="true">404</div>

      <div className="nf-content">
        <p className="nf-signal" aria-hidden="true">
          <span className="nf-bars"><i /><i /><i /><i /></span>
          NO SIGNAL
        </p>

        <h1 className="nf-title">
          This page<br />went missing.
        </h1>
        <p className="nf-sub">
          The link may be old or the address mistyped. Here is where you can go instead.
        </p>

        <nav className="nf-links" aria-label="Pages">
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
