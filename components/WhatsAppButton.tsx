/* WhatsApp contact, drawn in the site's own language: ink on paper, uppercase and
   letter-spaced, thin lines. WhatsApp is recognisable by its logo; the only motion is a
   faint ring around it. Styles live in globals.css (.wa-*).

   Both pieces link to /whatsapp (a server redirect), so a tap opens WhatsApp with a
   message already typed and the number is never on the page. */

import { BRAND_PATHS } from "@/components/BrandIcons";

/** The logo with its faint ring. Takes its colour (and size, in em) from the text around it. */
export function WhatsAppGlyph() {
  return (
    <span className="wa-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false"><path d={BRAND_PATHS.whatsapp} /></svg>
    </span>
  );
}

/** The outlined twin of the "Send brief" bar. */
export default function WhatsAppButton() {
  return (
    <a
      className="wa-btn"
      href="/whatsapp"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message me on WhatsApp (opens WhatsApp in a new tab)"
    >
      <span className="wa-btn-main">
        <WhatsAppGlyph />
        <span>WhatsApp me directly</span>
      </span>
      <span className="wa-btn-arrow" aria-hidden="true">{'↗'}</span>
    </a>
  );
}
