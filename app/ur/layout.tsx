import { Noto_Nastaliq_Urdu } from "next/font/google";
import UrduRoot from "@/components/i18n/UrduRoot";
import "@/components/i18n/ur.css";

/* The Urdu pages (/ur/tldr, /ur/hire). Everything below is right to left, in the Urdu font and with the Urdu dictionary.
   The font loads only here, so the English pages never download it. Only the Arabic-script part of the font is fetched:
   Latin words (Playwright, Docker...) fall through to the site's normal font. */
const urdu = Noto_Nastaliq_Urdu({ subsets: ["arabic"], display: "swap", variable: "--font-ur" });

export default function UrduLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ur" dir="rtl" className={`ur-root ${urdu.variable}`}>
      <UrduRoot>{children}</UrduRoot>
    </div>
  );
}
