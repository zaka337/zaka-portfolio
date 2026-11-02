/* What other people have said about working with Zaka. Shown on /tldr, /hire and their Urdu versions
   (components/Testimonials.tsx). While this list is empty the section simply does not appear.

   Rules, because these are real people's words:
   - REAL quotes only, exactly as they were written (trim for length with "..." and say nothing that was not said).
   - Only with the person's OK, in writing (a message is enough; keep it).
   - Give a public link when there is one (a LinkedIn recommendation, a GitHub issue or thread). It lets a visitor check
     the quote, and a checkable quote is worth far more than a nice one.
   - Leave the quote in the language it was written in; it is not translated on the Urdu pages.

   How to add one: copy the example below, fill it in, and put it in TESTIMONIALS. See docs/TESTIMONIALS.md. */

export interface Testimonial {
  /** Their words, as written */
  quote: string;
  /** Who said it */
  name: string;
  /** Their job title, e.g. "Engineering Lead" */
  role: string;
  /** Where they work, e.g. "Zong 5G" */
  org?: string;
  /** Where the words come from: "LinkedIn recommendation", "Email", "Internship feedback" */
  source: string;
  /** A public link to the original, when there is one */
  url?: string;
  /** The year, e.g. "2026" */
  date?: string;
  /** The language the quote is written in (default English) */
  lang?: "en" | "ur";
}

export const TESTIMONIALS: Testimonial[] = [
  /* Example (delete these lines and add real ones):
  {
    quote: "…",
    name: "Full Name",
    role: "Their job title",
    org: "Company",
    source: "LinkedIn recommendation",
    url: "https://www.linkedin.com/in/…",
    date: "2026",
  }, */
];
