/* Translation for the pages that have an Urdu version (/ur/tldr, /ur/hire).

   The English text in the components is the source of truth and the key: t("Job-fit check") returns the Urdu for that exact
   string from lib/ur.ts, or the English itself when there is no entry (technology names such as "Playwright" are
   deliberately left out: they stay in Latin script). Text with a changing part uses {name} marks:
   t("About {n} weeks", { n: 4 }). The English pages never load the Urdu dictionary: only /ur/* does (components/i18n/UrduRoot.tsx). */

export type Lang = "en" | "ur";
export type Vars = Record<string, string | number>;
export type T = (key: string, vars?: Vars) => string;

const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m)) : s);

/** A translator for a dictionary (null: English, the keys themselves) */
export function makeT(dict: Record<string, string> | null): T {
  return (key, vars) => fill(dict?.[key] ?? key, vars);
}

/** Where a page lives in each language: /hire <-> /ur/hire. Pages with no Urdu version are returned as they are. */
const TRANSLATED = new Set(["/hire", "/tldr"]);
export function pathFor(lang: Lang, path: string): string {
  const [base, ...rest] = path.split("#");
  const hash = rest.length ? `#${rest.join("#")}` : "";
  return lang === "ur" && TRANSLATED.has(base) ? `/ur${base}${hash}` : path;
}

/** Arrows that point the way a reader of that language moves: forward is to the right in English and to the left in Urdu */
export const arrowsFor = (lang: Lang) => (lang === "ur" ? { fwd: "←", back: "→", ext: "↖" } : { fwd: "→", back: "←", ext: "↗" });

/** The locale to format dates in */
export const localeFor = (lang: Lang) => (lang === "ur" ? "ur-PK" : "en-GB");
