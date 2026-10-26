import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PROJECTS, PROJECT_META, getProject } from "@/lib/projects";
import JsonLd from "@/components/JsonLd";
import { breadcrumbNode, personRef } from "@/lib/seo";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import ScrollUnlock from "@/components/ScrollUnlock";
import LiveProof from "@/components/LiveProof";
import "./case.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  const url = `${SITE_URL}/projects/${p.slug}`;
  // A project with a screenshot shares that. The others get the generated card next to this page
  // (opengraph-image.tsx), which Next adds itself when no image is set here.
  const image = p.shot ? { url: p.shot, width: 1280, height: 800, alt: `${p.title} screenshot` } : null;
  return {
    title: `${p.title} — Case Study`,
    description: PROJECT_META[p.slug] ?? p.summary,
    keywords: [p.title, `${p.title} case study`, p.kind, ...p.chips, "Zaka Ullah Waheed"],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${p.title} — Case Study | ${SITE_NAME}`,
      description: PROJECT_META[p.slug] ?? p.summary,
      url,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.title} — Case Study | ${SITE_NAME}`,
      description: PROJECT_META[p.slug] ?? p.summary,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

const CATEGORY: Record<string, string> = {
  "qa-with-zaka": "EducationalApplication",
  "zong-health-scanner": "DeveloperApplication",
  "momcare-ai": "HealthApplication",
  glamourhub: "ShoppingApplication",
  bazaarbox: "ShoppingApplication",
  portfolio: "WebApplication",
};

export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();

  const i = PROJECTS.findIndex((x) => x.slug === slug);
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const url = `${SITE_URL}/projects/${p.slug}`;
  const visit = p.live ?? p.repo;
  const shown = (p.live ?? `github.com/zaka337/${p.repoName ?? ""}`).replace(/^https?:\/\//, "").replace(/\/$/, "");

  const jsonLd = [
    breadcrumbNode([["Projects", "/projects"], [p.title, `/projects/${p.slug}`]]),
    {
      "@type": "SoftwareApplication",
      "@id": `${url}#app`,
      name: p.title,
      description: PROJECT_META[p.slug] ?? p.summary,
      url: p.live ?? url,
      applicationCategory: CATEGORY[p.slug] ?? "WebApplication",
      operatingSystem: "Web",
      author: personRef(),
      mainEntityOfPage: url,
      ...(p.repo ? { sameAs: [p.repo] } : {}),
    },
  ];

  return (
    <main className="cs-root">
      <ScrollUnlock />
      <JsonLd data={jsonLd} />

      <nav className="cs-nav">
        <Link href="/projects">{'←'} ALL PROJECTS</Link>
        <span>CASE STUDY</span>
        <span>0{i + 1} / 0{PROJECTS.length}</span>
      </nav>

      {/* Hero */}
      <header className="cs-hero" style={{ ["--bg" as string]: p.bg } as React.CSSProperties}>
        <p className="cs-label">{p.kind} {'—'} {p.year}</p>
        <h1 className="cs-title">{p.title}</h1>
        <p className="cs-summary">{p.summary}</p>

        <dl className="cs-meta">
          <div><dt>ROLE</dt><dd>{p.role}</dd></div>
          <div><dt>YEAR</dt><dd>{p.year}</dd></div>
          <div><dt>STATUS</dt><dd>{p.status}</dd></div>
          <div><dt>BUILT WITH</dt><dd>{p.chips.join(", ")}</dd></div>
        </dl>

        <div className="cs-actions">
          {p.live && <a className="cs-btn cs-btn-solid" href={p.live} target="_blank" rel="noopener noreferrer">Visit live {'↗'}</a>}
          {p.repo && <a className="cs-btn cs-btn-ghost" href={p.repo} target="_blank" rel="noopener noreferrer">Source on GitHub {'↗'}</a>}
        </div>

        <a className="cs-frame" href={visit} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.title}`}>
          <div className="cs-bar" aria-hidden="true">
            <i /><i /><i />
            <span>{shown}</span>
          </div>
          <div className="cs-viewport">
            {p.shot ? (
              <Image src={p.shot} alt={`${p.title} screenshot`} width={1280} height={800} priority sizes="(max-width: 900px) 92vw, 1100px" />
            ) : (
              <div className="cs-term" aria-hidden="true">
                <span className="dim">$ git clone github.com/zaka337/{p.repoName}</span>
                <span>language&nbsp;&nbsp;&nbsp;{p.language}</span>
                <span>status&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;source on GitHub</span>
                <span className="big">{p.title}<i className="cs-caret" /></span>
              </div>
            )}
          </div>
        </a>
      </header>

      {/* Numbers */}
      <ul className="cs-facts">
        {p.facts.map((f) => (
          <li key={f.label}>
            <strong>{f.value}</strong>
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      {/* Goal */}
      <section className="cs-sec">
        <h2 className="cs-h2">The goal</h2>
        <p className="cs-lead">{p.goal}</p>
      </section>

      {/* What I built */}
      <section className="cs-sec">
        <h2 className="cs-h2">What I built</h2>
        <ul className="cs-built">
          {p.built.map((b) => (
            <li key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Stack */}
      <section className="cs-sec">
        <h2 className="cs-h2">The stack</h2>
        <dl className="cs-stack">
          {p.stack.map((g) => (
            <div key={g.group}>
              <dt>{g.group}</dt>
              <dd>
                {g.items.map((it) => <span className="cs-chip" key={it}>{it}</span>)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Outcome */}
      <section className="cs-sec">
        <h2 className="cs-h2">The outcome</h2>
        <div>
          <ul className="cs-outcome">
            {p.outcome.map((o) => <li key={o}>{o}</li>)}
          </ul>
          {p.note && <p className="cs-note">{p.note}</p>}
        </div>
      </section>

      {/* Proof: the project checked for real, while the visitor watches */}
      {(p.live || p.repo) && (
        <section className="cs-sec">
          <h2 className="cs-h2">Don&apos;t take my word</h2>
          <LiveProof slug={p.slug} hasSite={!!p.live} hasRepo={!!p.repo} />
        </section>
      )}

      {/* Next / previous */}
      <nav className="cs-more" aria-label="More case studies">
        <Link href={`/projects/${prev.slug}`}>
          <span>{'←'} PREVIOUS</span>
          <strong>{prev.title}</strong>
        </Link>
        <Link href={`/projects/${next.slug}`} className="cs-next">
          <span>NEXT {'→'}</span>
          <strong>{next.title}</strong>
        </Link>
      </nav>

      <section className="cs-cta">
        <p className="cs-label">BUILDING SOMETHING SIMILAR?</p>
        <h2>Let&apos;s talk about your project.</h2>
        <div className="cs-actions" style={{ justifyContent: "center" }}>
          <Link className="cs-btn cs-btn-solid" href="/contact-me">Start a brief</Link>
          <Link className="cs-btn cs-btn-ghost" href="/projects">All projects</Link>
        </div>
      </section>
    </main>
  );
}
