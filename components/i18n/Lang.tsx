"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { arrowsFor, makeT, pathFor, type Lang, type T } from "@/lib/i18n";

/* Which language the page below is in, and the translator for it. English everywhere unless an Urdu route wraps its page
   in <UrduRoot> (components/i18n/UrduRoot.tsx), which is the only thing that loads the Urdu dictionary. */

interface LangValue {
  lang: Lang;
  t: T;
  /** An internal link in the reader's language (/hire becomes /ur/hire in Urdu) */
  href: (path: string) => string;
  /** Arrows that point the way this language reads: fwd (next), back, ext (opens elsewhere) */
  ar: { fwd: string; back: string; ext: string };
}

const english: LangValue = { lang: "en", t: makeT(null), href: (p) => p, ar: arrowsFor("en") };
const Ctx = createContext<LangValue>(english);

export function LangProvider({ lang, dict, children }: { lang: Lang; dict: Record<string, string> | null; children: ReactNode }) {
  const value = useMemo<LangValue>(() => ({ lang, t: makeT(dict), href: (p) => pathFor(lang, p), ar: arrowsFor(lang) }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
