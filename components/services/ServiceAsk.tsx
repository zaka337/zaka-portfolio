"use client";

import Link from "next/link";
import { saveDraft } from "@/lib/draft";

/* The "ask about this" button on /services: it leaves a ready-made message for the contact form (lib/draft.ts: kept in
   this tab's session storage, never in the address) and opens the form, which fills itself in. */
export default function ServiceAsk({ message, need, className, children }: { message: string; need: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href="/contact-me" className={className} onClick={() => saveDraft({ from: "services page", message, needs: [need] })}>
      {children}
    </Link>
  );
}
