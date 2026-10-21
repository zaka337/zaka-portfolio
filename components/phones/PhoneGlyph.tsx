import { BrandIcon } from "@/components/BrandIcons";
import type { AppId } from "@/lib/phoneOS";

/* The picture on each app icon: the real platform logos where there is one (drawn in the text
   colour, like the rest of the site), simple line drawings for the rest. */
export default function PhoneGlyph({ id }: { id: AppId }) {
  switch (id) {
    case "mail": return <BrandIcon name="mail" />;
    case "whatsapp": return <BrandIcon name="whatsapp" />;
    case "linkedin": return <BrandIcon name="linkedin" />;
    case "github": return <BrandIcon name="github" />;
    case "instagram": return <BrandIcon name="instagram" />;
    case "resume": return <BrandIcon name="resume" />;
    case "projects":
      return (
        <svg className="brand-icon brand-icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.2" y="3.2" width="7.6" height="7.6" rx="1.6" /><rect x="13.2" y="3.2" width="7.6" height="7.6" rx="1.6" />
          <rect x="3.2" y="13.2" width="7.6" height="7.6" rx="1.6" /><rect x="13.2" y="13.2" width="7.6" height="7.6" rx="1.6" />
        </svg>
      );
    case "snake":
      return (
        <svg className="brand-icon brand-icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 18h9a4 4 0 0 0 0-8H9a3 3 0 0 1 0-6h8" /><circle cx="19" cy="4" r="1.1" fill="currentColor" />
        </svg>
      );
    case "clock":
      return (
        <svg className="brand-icon brand-icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.4 2" />
        </svg>
      );
    case "book":
      return (
        <svg className="brand-icon brand-icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.4" y="5" width="17.2" height="15.6" rx="2.2" /><path d="M3.4 9.8h17.2M8 3v4M16 3v4" /><path d="M8 14h3M13 14h3M8 17.4h3" />
        </svg>
      );
    case "qa":
      return (
        <svg className="brand-icon brand-icon-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <ellipse cx="12" cy="14" rx="5" ry="6" /><path d="M9.5 8.6a2.6 2.6 0 0 1 5 0M12 8v12M7 12H3.4M17 12h3.6M7.4 17l-3 1.6M16.6 17l3 1.6M8 6L6 4M16 6l2-2" />
        </svg>
      );
  }
}
