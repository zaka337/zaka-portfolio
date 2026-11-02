"use client";

import { useEffect, useState } from "react";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials";
import { useLang } from "@/components/i18n/Lang";
import "./testimonials.css";

/* "What people say": the quotes in lib/testimonials.ts, as cards. With none, it renders nothing at all.
   Development only: add ?proof to the address to see the layout with clearly labelled SAMPLE cards. That code is removed from
   the production build (the NODE_ENV test is resolved at build time), so no placeholder can ever reach the live site. */

const SAMPLE: Testimonial[] =
  process.env.NODE_ENV !== "production"
    ? [
        { quote: "SAMPLE ONLY, NOT A REAL QUOTE. This is where a short, real sentence from a colleague or a client would sit, about two or three lines long.", name: "Sample Person", role: "Engineering Lead", org: "Example Co", source: "LinkedIn recommendation", url: "https://example.com", date: "2026" },
        { quote: "SAMPLE ONLY, NOT A REAL QUOTE. A second card, to check how the cards sit side by side and how a longer quote wraps onto more lines than the first one does.", name: "Another Sample", role: "Product Manager", org: "Sample Ltd", source: "Email", date: "2026" },
        { quote: "SAMPLE ONLY, NOT A REAL QUOTE.", name: "Third Sample", role: "Founder", source: "Internship feedback" },
      ]
    : [];

export default function Testimonials({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && /[?&]proof(&|$)/.test(window.location.search)) setPreview(true);
  }, []);

  const list = preview ? SAMPLE : TESTIMONIALS;
  if (list.length === 0) return null;

  return (
    <section className={`pf ${className}`} aria-labelledby="pf-h">
      <h2 id="pf-h" className="pf-h">{t("WHAT PEOPLE SAY")}</h2>
      <div className="pf-grid">
        {list.map((q) => (
          <figure key={`${q.name}-${q.source}`} className="pf-card">
            <blockquote className="pf-quote" lang={q.lang ?? "en"} dir="auto">{q.quote}</blockquote>
            <figcaption className="pf-by">
              <span className="pf-name">{q.name}</span>
              <span className="pf-role">{q.role}{q.org ? `, ${q.org}` : ""}</span>
              <span className="pf-src">
                {q.url
                  ? <a href={q.url} target="_blank" rel="noopener noreferrer">{q.source}{q.date ? ` · ${q.date}` : ""} {'↗'}</a>
                  : <>{q.source}{q.date ? ` · ${q.date}` : ""}</>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
