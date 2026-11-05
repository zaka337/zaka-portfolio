import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import ScrollUnlock from "@/components/ScrollUnlock";
import { breadcrumbNode, personRef } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { HUB, HUB_COUNT } from "@/lib/tools";
import "@/components/services/services.css";
import "@/components/tools/toolshub.css";

// Keep the title near 60 characters and the description under 160: search results cut off anything longer
// (the sitepulse scan of this very site flagged the first version, 84 and 180).
const DESC = `A free website health check, an open-source AI testing tool, hiring tools, fixed-scope services, projects and a game from ${SITE_NAME}, all in one place.`;

export const metadata: Metadata = {
  title: { absolute: `Tools and Services: Free Website Check | ${SITE_NAME}` },
  description: DESC,
  alternates: { canonical: `${SITE_URL}/tools` },
  openGraph: {
    title: `Tools and services | ${SITE_NAME}`,
    description: "Free tools you can use now, fixed-scope services, projects and a game, all in one place.",
    url: `${SITE_URL}/tools`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `Tools and services by ${SITE_NAME}` }],
  },
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

export default function ToolsPage() {
  return (
    <main className="sv-root">
      <ScrollUnlock />
      <JsonLd
        data={[
          breadcrumbNode([["Tools and services", "/tools"]]),
          {
            "@type": "CollectionPage",
            name: `Tools and services by ${SITE_NAME}`,
            description: DESC,
            url: `${SITE_URL}/tools`,
            author: personRef(),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: HUB_COUNT,
              itemListElement: HUB.flatMap((g) => g.items).map((it, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: it.title,
                url: isExternal(it.href) ? it.href : `${SITE_URL}${it.href}`,
              })),
            },
          },
        ]}
      />

      <nav className="sv-nav">
        <Link href="/" prefetch={false}>{'← '}BACK</Link>
        <span>TOOLS AND SERVICES</span>
        <Link href="/contact-me" prefetch={false}>BRIEF {'↗'}</Link>
      </nav>

      <header className="sv-hero">
        <p className="sv-micro">{HUB_COUNT} THINGS {'·'} FREE TOOLS {'·'} SERVICES {'·'} OPEN SOURCE</p>
        <h1 className="sv-h1">
          <span>The</span>
          <span>toolbox.</span>
        </h1>
        <p className="sv-lead">Everything on this portfolio that you can use, in one place: free tools that run now, the tools I wrote and use, ways to work with me, and the rest of the site. No sign-up, and nothing you type into a tool is stored.</p>
        <p className="sv-jump">
          {HUB.map((g) => <a key={g.id} href={`#${g.id}`}>{g.title}</a>)}
        </p>
        <p className="sv-note th-tip">Tip: press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>/</kbd>) on any page to search all of this.</p>
      </header>

      <div className="th-groups">
        {HUB.map((g, gi) => (
          <section key={g.id} id={g.id} className="th-group" aria-labelledby={`${g.id}-t`}>
            <Reveal>
              <p className="sv-micro">0{gi + 1}</p>
              <h2 id={`${g.id}-t`} className="sv-h2">{g.title}</h2>
              <p className="sv-lead">{g.lead}</p>
              <ul className="th-grid">
                {g.items.map((it) => {
                  const body = (
                    <>
                      <span className="th-go" aria-hidden="true">{isExternal(it.href) ? 'OPEN ↗' : 'OPEN →'}</span>
                      <h3 className="th-title">{it.title}</h3>
                      <p>{it.blurb}</p>
                      {it.tags.length > 0 && <span className="th-tags">{it.tags.map((t) => <span key={t} className="th-tag">{t}</span>)}</span>}
                    </>
                  );
                  return (
                    <li key={it.id}>
                      {/* No prefetch: sixteen links to heavy routes (the 3D carousel, the game) must not all be fetched when this page opens */}
                      {isExternal(it.href)
                        ? <a className="th-card" href={it.href} target="_blank" rel="noopener noreferrer">{body}</a>
                        : <Link className="th-card" href={it.href} prefetch={false}>{body}</Link>}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </section>
        ))}
      </div>

      <section className="sv-end">
        <h2 className="sv-h2">Cannot find what you need?</h2>
        <p className="sv-lead">Tell me what you are trying to do. If I have not built it yet, I may be able to.</p>
        <p className="sv-end-acts">
          <Link href="/contact-me" prefetch={false} className="sv-btn is-main">Send a project brief</Link>
          <Link href="/services" prefetch={false} className="sv-btn">See the services</Link>
        </p>
      </section>
    </main>
  );
}
