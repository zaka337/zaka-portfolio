"use client";

import { useEffect, useRef, useState } from "react";

/* "Chat on WhatsApp": a button that looks like WhatsApp, and optionally the little
   "typing..." chat bubble that goes with it. Styles live in globals.css (.wa-*).

   It links to /whatsapp (a server redirect), so the visitor's tap opens WhatsApp with a
   message already typed and the number is never on the page. All motion is CSS and
   switches itself off for visitors who prefer reduced motion (see the global rule).
   The chat teaser waits until it is actually on screen before it starts "typing", so it
   is not over before anyone scrolls down to it. */

/* The WhatsApp logo (Simple Icons, CC0). */
const GLYPH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";

export default function WhatsAppButton({ teaser = false }: { teaser?: boolean }) {
  const chatRef = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = chatRef.current;
    if (!teaser || !el) return;
    if (typeof IntersectionObserver === "undefined") { setPlay(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setPlay(true); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [teaser]);

  return (
    <div className="wa-wrap">
      {teaser && (
        // Decorative: a chat bubble that "types", then says hello. The button is the real control.
        <div ref={chatRef} className="wa-chat" data-play={play ? "" : undefined} aria-hidden="true">
          <div className="wa-bubble wa-typing"><i /><i /><i /></div>
          <div className="wa-bubble wa-msg">
            <b>Zaka</b>
            <span>Hey! Have a project in mind? Message me here.</span>
          </div>
        </div>
      )}

      <a
        className="wa-btn"
        href="/whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with me on WhatsApp (opens WhatsApp in a new tab)"
      >
        <span className="wa-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d={GLYPH} /></svg>
        </span>
        <span className="wa-text" aria-hidden="true">
          <b>Chat on WhatsApp</b>
          <small>Message me directly</small>
        </span>
        <span className="wa-arrow" aria-hidden="true">{'↗'}</span>
      </a>
    </div>
  );
}
