import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import ScrollUnlock from "@/components/ScrollUnlock";
import ServiceAsk from "@/components/services/ServiceAsk";
import { AVAIL } from "@/lib/availability";
import { breadcrumbNode, personRef } from "@/lib/seo";
import { SERVICES, STEPS, askMessage, timelineOf } from "@/lib/services";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "@/components/services/services.css";

const DESC = "Four fixed-scope pieces of work from Zaka Ullah Waheed: a website health audit, automated tests for your web app, a fast Next.js marketing website, and one automated workflow. Written scope and timeline before any work starts.";

export const metadata: Metadata = {
  title: { absolute: `Services: Website Audit, Test Automation, Next.js Sites, Workflow Automation | ${SITE_NAME}` },
  description: DESC,
  alternates: { canonical: `${SITE_URL}/services` },
  openGraph: {
    title: `Services | ${SITE_NAME}`,
    description: "Four fixed-scope pieces of work, each with a written scope and timeline before it starts.",
    url: `${SITE_URL}/services`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Services by ${SITE_NAME}` }],
  },
};

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const FAQ = [
  {
    q: "Is the price really fixed?",
    a: "Every piece starts with a written scope, timeline and price that you approve before any work begins. If something outside the scope comes up, we agree on it separately instead of it quietly growing.",
  },
  {
    q: "Where are you, and does the time difference matter?",
    a: `I am in ${AVAIL.place}, Pakistan (UTC+5), working Monday to Friday, ${hhmm(AVAIL.from)} to ${hhmm(AVAIL.to)}. Most work is done by message and short calls, and the call helper on the hire page shows the overlap with your own time zone.`,
  },
  {
    q: "How long will it really take?",
    a: "The timelines on this page come from the same estimator as the hire page: typical for one developer on a job of that size. I confirm or adjust them once I have read your real brief.",
  },
  {
    q: "Can I see work like this?",
    a: "Each piece above links to a project I built that is closest to it, with a case study of what was made and how.",
  },
  {
    q: "My project does not fit any of these.",
    a: "Most real projects do not fit neatly. Send a brief, or use the estimator on the hire page to get a rough timeline first.",
  },
] as const;

export default function ServicesPage() {
  return (
    <main className="sv-root">
      <ScrollUnlock />
      <JsonLd
        data={[
          breadcrumbNode([["Services", "/services"]]),
          ...SERVICES.map((s) => ({
            "@type": "Service",
            "@id": `${SITE_URL}/services#${s.id}`,
            name: s.title,
            description: s.summary,
            url: `${SITE_URL}/services#${s.id}`,
            serviceType: s.need,
            areaServed: "Worldwide",
            provider: personRef(),
          })),
        ]}
      />

      <nav className="sv-nav">
        <Link href="/">{'← '}BACK</Link>
        <span>SERVICES</span>
        <Link href="/contact-me">BRIEF {'↗'}</Link>
      </nav>

      <header className="sv-hero">
        <p className="sv-micro">ZAKA ULLAH WAHEED {'·'} OPEN FOR REMOTE WORK {'·'} {AVAIL.place.toUpperCase()}</p>
        <h1 className="sv-h1">
          <span>Fixed-scope</span>
          <span>work.</span>
        </h1>
        <p className="sv-lead">Four defined pieces of work. Each one has a clear list of what you get, what I need from you, and what is not included, so you know where you stand before anything starts. No price on this page: you get it in writing, with the scope and the timeline, before you decide.</p>
        <p className="sv-jump">
          {SERVICES.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.n} {s.title}</a>
          ))}
        </p>
      </header>

      <div className="sv-list">
        {SERVICES.map((s) => (
          <section key={s.id} id={s.id} className="sv-item" aria-labelledby={`${s.id}-t`}>
            <Reveal className="sv-item-in">
              <div className="sv-left">
                <p className="sv-micro">{s.n}</p>
                <h2 id={`${s.id}-t`} className="sv-h2">{s.title}</h2>
                <p className="sv-for"><b>For:</b> {s.forWho}</p>
                <p className="sv-sum">{s.summary}</p>
                <p className="sv-time"><span className="sv-micro">TYPICAL TIME</span><b>{timelineOf(s.pick)}</b></p>
                <ServiceAsk message={askMessage(s)} need={s.need} className="sv-btn is-main">Ask about this</ServiceAsk>
              </div>
              <div className="sv-right">
                <h3 className="sv-h3">What you get</h3>
                <ul className="sv-ul">{s.gets.map((g) => <li key={g}>{g}</li>)}</ul>
                <h3 className="sv-h3">What I need from you</h3>
                <ul className="sv-ul">{s.needs.map((g) => <li key={g}>{g}</li>)}</ul>
                <h3 className="sv-h3">Not included</h3>
                <ul className="sv-ul is-muted">{s.notIncluded.map((g) => <li key={g}>{g}</li>)}</ul>
                <p className="sv-proof"><span className="sv-micro">SEE SIMILAR WORK</span>{s.proof.map((p) => <Link key={p.href} href={p.href}>{p.label}</Link>)}</p>
              </div>
            </Reveal>
          </section>
        ))}
      </div>

      <section className="sv-how">
        <p className="sv-micro">HOW IT WORKS</p>
        <h2 className="sv-h2">Four steps, nothing hidden.</h2>
        <ol className="sv-steps">
          {STEPS.map((st, i) => (
            <li key={st.title}>
              <span className="sv-step-n">0{i + 1}</span>
              <h3 className="sv-h3">{st.title}</h3>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="sv-faq">
        <p className="sv-micro">QUESTIONS</p>
        <h2 className="sv-h2">Before you write.</h2>
        <div className="sv-qs">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="sv-end">
        <h2 className="sv-h2">Not sure which one fits?</h2>
        <p className="sv-lead">Paste a job description or a rough idea into the estimator, or just send a brief. Either way you get a real answer, not a sales call.</p>
        <p className="sv-end-acts">
          <Link href="/contact-me" className="sv-btn is-main">Send a project brief</Link>
          <Link href="/hire#estimate" className="sv-btn">Get a rough timeline</Link>
          <Link href="/tools/site-check" className="sv-btn">Try the free site check</Link>
        </p>
      </section>
    </main>
  );
}
