# Testimonials ("What people say")

The section appears on `/tldr`, `/hire` and their Urdu versions (`/ur/tldr`, `/ur/hire`). **While the list is empty, nothing
is shown at all.** There are no placeholder quotes in the live site, and none can be added by accident: the preview cards
exist only in development (`?proof` on the address) and are removed from the production build.

## What to get from each person

1. **The quote**, in their own words. Short is better (one to three sentences). You can trim with "..." but never reword.
2. **Their OK to use it**, in writing. A message or an email saying "yes, you can put this on your website" is enough. Keep it.
3. **Name, job title and company.**
4. **A link to the original, if there is one.** A LinkedIn recommendation, a GitHub issue or thread, a public post. This is
   the single most valuable part: a visitor can click it and see the quote is real.

Good places to ask: LinkedIn ("Request a recommendation" on your profile), the supervisor of your Zong 5G and Apexify
internships, anyone who used QA with Zaka, a client or classmate you built something for.

## How to add one

Open `lib/testimonials.ts`, copy the example in the comment, fill it in and put it inside `TESTIMONIALS`:

```ts
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Zaka found three bugs in our checkout that our own team had missed for months.",
    name: "Full Name",
    role: "Engineering Lead",
    org: "Company",
    source: "LinkedIn recommendation",
    url: "https://www.linkedin.com/in/...",   // optional but strongly recommended
    date: "2026",
  },
];
```

- `lang: "ur"` for a quote written in Urdu (it is shown as written, never translated).
- One to three cards look best; more are fine, they wrap into rows.
- To remove one, delete its entry. To hide the whole section, empty the list.

## Rules

- Real quotes only, exactly as written, with permission. Never invent or "improve" one.
- Do not put a quote in the list before you have the person's OK.
