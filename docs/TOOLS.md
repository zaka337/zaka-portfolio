# The tools hub (/tools)

One page that lists everything a visitor can use or open on the portfolio, so nobody has to know or type an address. Free tools, the open-source tools, ways to work with me, and the rest of the site.

## How it fits together

| Piece | File |
|---|---|
| **The list** (the single source of truth) | `lib/tools.ts` (`HUB`) |
| The page (server rendered, with structured data) | `app/tools/page.tsx`, `components/tools/toolshub.css` (on top of `components/services/services.css`) |
| The home screen entry (a pill above the status line; on a phone, under the name) | `components/ToolsDoor.tsx`, `components/toolsdoor.css`, used in `components/HomeScreen.tsx` |
| Mistyped addresses | `redirects()` in `next.config.ts` |
| Search (Ctrl+K) | `lib/palette.ts` (`tools` item, also in `SUGGESTED`) |
| The hidden terminal | `tools` command and `open tools` in `components/Terminal.tsx` |
| Other entries | the 404 page (`app/not-found.tsx`), the sitemap, `public/llms.txt`, a back link ("ALL TOOLS") on `/tools/site-check` and `/tools/llmcheck`, and a button at the end of `/services` |

## Adding something new (a checklist)

1. Add an item to the right group in `lib/tools.ts`: `title`, a plain one-sentence `blurb`, `href`, short `tags`. Do not describe anything the page does not do.
2. If it lives under a new address people might mistype, add the likely mistypes to `redirects()` in `next.config.ts`. Do **not** redirect `/tools` (it is the hub).
3. Add it to the Ctrl+K list in `lib/palette.ts` and to `public/llms.txt`; add the page to `app/sitemap.ts`.
4. Run `D:\Projects\Zaka_Promo\_tmp\tools-hub-ui.cjs` (the group sizes at the top of that script are the counts in `HUB`, so update them too).
5. Keep the page `<title>` to about 60 characters (including the ` | Zaka Ullah Waheed` the pages end with, which is 20) and the meta description under 160; search results cut off anything longer. The first versions of `/tools`, `/services` and both tool pages were 78 to 100 characters, and the site's own health check (`/tools/site-check`) flagged them. After deploying, scan the new page with it.

## Rules that matter

- **No prefetching from the hub.** The cards use `prefetch={false}`. With sixteen links, the default would preload heavy routes (the 3D carousel, the racing game) when the hub opens. The home entry does the same, so the home page's first load stays as light as before.
- **Nothing is advertised before it exists.** While a repository is not public, its card says "being published" and links to the page that exists. The switches are in `lib/sitepulseLinks.ts`: `SITEPULSE.onGitHub` (source public; the card links to GitHub in a new tab and says "open source") and `LLMCHECK.published` (both are true since 2026-11-06). `SITEPULSE.published` means the npm package exists too (true since 2026-11-06), which is what lets /tools/site-check show `npx sitepulse`.
- **The home page is the locked 3D scene.** The entry is plain text and CSS (no per-frame work, no scripts). On desktop it is anchored above the status line with room for its night-time second row; on a phone it is a grid item in the empty row under the name. If the home layout changes, re-check it at 1280x720, 1920x1080, 1024x700, a short window, a phone and a small phone, and at night in Islamabad (the status line grows). `tools-hub-ui.cjs ... home` does exactly that, including overlap checks against every other home element.
- **Hub copy is English only** (the Urdu pages are `/ur/tldr` and `/ur/hire`; the cards say "ALSO IN URDU").

## Tests

`D:\Projects\Zaka_Promo\_tmp\tools-hub-ui.cjs <base> <shotsDir> [home]` against a production build: the page and its structured data, every card's destination, no prefetch requests, keyboard use, the way back from a tool, all the redirects (and that `/tools` is not one), Ctrl+K, the 404 link, the sitemap, `llms.txt`, the phone layout, and with `home` the entry on the home screen at seven sizes (visible, fully on screen, no overlap, opens the hub).
