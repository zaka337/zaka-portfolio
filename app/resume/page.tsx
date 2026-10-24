import type { Metadata } from "next";
import Link from "next/link";
import { resume, RESUME_PDF } from "@/lib/resume";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import ScrollUnlock from "@/components/ScrollUnlock";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode } from "@/lib/seo";
import PrintButton from "@/components/PrintButton";
import "./resume.css";

export const metadata: Metadata = {
  title: { absolute: "Zaka Ullah Waheed Resume | Full-Stack & QA Automation" },
  description:
    "Resume of Zaka Ullah Waheed, full-stack developer and QA automation engineer in Islamabad. Zong 5G and Apexify internships. Download the PDF.",
  alternates: { canonical: `${SITE_URL}/resume` },
  openGraph: {
    title: `Resume | ${SITE_NAME}`,
    description: "Full-stack developer and QA automation engineer. React, Next.js, TypeScript, Flutter, Python and Playwright.",
    url: `${SITE_URL}/resume`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Resume of ${SITE_NAME}` }],
  },
};

export default function ResumePage() {
  const r = resume;
  return (
    <div className="rs-page">
      <ScrollUnlock />
      <JsonLd data={breadcrumbNode([["Resume", "/resume"]])} />

      <div className="rs-toolbar">
        <Link href="/">{'←'} Back</Link>
        <div className="rs-tools">
          <Link className="rs-btn rs-btn-ghost" href="/hire">Check the fit</Link>
          <PrintButton className="rs-btn rs-btn-ghost">Print</PrintButton>
          <a className="rs-btn rs-btn-solid" href={RESUME_PDF} download>Download PDF</a>
        </div>
      </div>

      <main className="rs-sheet">
        <header className="rs-head">
          <h1>{r.name}</h1>
          <p className="rs-title">{r.title} <span className="rs-loc">{r.location}</span></p>
          <p className="rs-contact">
            {r.contact.map((c) => (
              <span key={c.label}><a href={c.href}>{c.label}</a></span>
            ))}
          </p>
        </header>

        <section>
          <h2>Summary</h2>
          <p>{r.summary}</p>
        </section>

        <section>
          <h2>Experience</h2>
          {r.experience.map((e) => (
            <article key={e.org} className="rs-item">
              <div className="rs-row">
                <p><strong>{e.role}</strong>, {e.org}</p>
                <span>{e.period}</span>
              </div>
              <ul>
                {e.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section>
          <h2>Projects</h2>
          {r.projects.map((p) => (
            <article key={p.name} className="rs-item">
              <div className="rs-row">
                <p><strong>{p.name}</strong> <span className="rs-meta">{p.meta}</span></p>
                <span className="rs-link">{p.link}</span>
              </div>
              <ul>
                {p.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section>
          <h2>Skills</h2>
          <dl className="rs-skills">
            {r.skills.map((s) => (
              <div key={s.group}>
                <dt>{s.group}</dt>
                <dd>{s.items}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Education</h2>
          {r.education.map((e) => (
            <div className="rs-row" key={e.school}>
              <p><strong>{e.degree}</strong>, {e.school}</p>
              <span>{e.period}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
