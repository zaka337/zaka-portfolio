# Services page (/services)

Four fixed-scope offers, each with what you get, what is needed from the client, what is not included, a typical time and a button that opens the contact form with a ready-made message.

| Piece | File |
|---|---|
| The offers and the process wording | `lib/services.ts` (edit the text here) |
| The page (server rendered) | `app/services/page.tsx` |
| The "Ask about this" button | `components/services/ServiceAsk.tsx` (uses `lib/draft.ts`, the same hand-off the /hire tools use) |
| Styles | `components/services/services.css` |

## Decisions that are the owner's (check them)

- **No prices.** The estimator's header says timelines only, never prices, so none appear, and the page says the price comes in writing with the scope and timeline. If you ever want to show prices, add a `price` field to `Service` in `lib/services.ts`; the structured data deliberately contains no `offers`, so add it there too.
- **Commitments the copy makes on your behalf**, all in `lib/services.ts` and the FAQ in `app/services/page.tsx`. Remove or soften any you do not want to keep:
  - "a written scope, timeline and price that you approve before any work begins", and that out-of-scope work is agreed separately
  - "regular demos" while building
  - the code goes "in your repository, deployed where you want it, with short notes" at handover
  - your hours (read from `lib/availability.ts`, so they stay in sync with the call helper)
- **What each offer promises** (deliverables, "not included"). They are based on projects you have really built (Zong Health Scanner, QA with Zaka, this portfolio, GlamourHub), but they are offers: change them to match what you want to sell.

## Timelines

Not typed in. `timelineOf()` asks the same estimator as /hire (`lib/estimate.ts`) with a fixed size and features per offer, so the two pages cannot disagree and tuning the estimator tunes both. When the fastest case is under a week it shows working days (a week is counted as five).

Current values: audit 3 to 8 working days, tests 2 to 4 weeks, website 1.5 to 3 weeks, automation 1.5 to 3.5 weeks.

## Adding or removing an offer

Add an object to `SERVICES` in `lib/services.ts`: the page, the jump links, the structured data and the sitemap-facing anchors all read from it. `need` must be one of the contact form's chips (`NEEDS` in `lib/contactForm.ts`). Link proofs only to pages that exist (the UI test checks that every one resolves).

## Linked from

The sitemap, the Ctrl+K palette (`lib/palette.ts`) and the footer of /tools/site-check ("Want someone to fix what it finds?").

## Tests

`D:\Projects\Zaka_Promo\_tmp\services-ui.cjs` against a production build (`BASE=http://localhost:3100`): timelines, no price figures, every button's message and chip, jump links, FAQ, proof links, structured data, phone layout.

Not translated: English only (the Urdu pages are `/ur/tldr` and `/ur/hire`).
