"use client";

import type { ReactNode } from "react";
import { UR } from "@/lib/ur";
import { LangProvider } from "./Lang";

/* Wraps a page in Urdu. This file is the only importer of the dictionary, so the English pages never carry it. */
export default function UrduRoot({ children }: { children: ReactNode }) {
  return <LangProvider lang="ur" dict={UR}>{children}</LangProvider>;
}
