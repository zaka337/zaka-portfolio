# The Urdu pages

`/ur/tldr` and `/ur/hire` are the Urdu versions of `/tldr` and `/hire`: right to left, in a Nastaliq font, with every
sentence translated. Each page links to its English twin and back (a small "English" / "اردو" link in the top bar), and
search engines are told about both (`hreflang`), so people searching in Urdu are shown the Urdu page.

## Changing a line of Urdu

Everything is in **`lib/ur.ts`**: one line per sentence, `"the English": "اردو"`. The English text is the key, so do not
change the English side (it must match the text in the page); change only the Urdu after the colon. `{name}` marks are
filled in by the page (numbers, project names): keep them, and move them wherever the Urdu needs them.

Technology names (Playwright, Docker, React...) are intentionally left in English letters; anything not in the file simply
shows in English.

If you review the Urdu, the parts worth the most attention are the headlines, the long paragraphs and the sentences with
`{marks}` in them (the job-fit notes and the messages that are sent to you).

## How it fits together

- `lib/i18n.ts`: the translator (`t("English")`), arrows that point the right way, link helper.
- `components/i18n/`: `UrduRoot.tsx` loads the dictionary (only the Urdu routes do, so English pages stay as light as before),
  `ur.css` is the right-to-left and Urdu-script styling.
- `app/ur/`: the layout (font, `lang="ur" dir="rtl"`) and the two pages. They reuse the same components as the English pages.
- The messages the tools write for you (job-fit summary, call request, project brief) are in Urdu on the Urdu pages. The
  contact form itself stays English.

## Adding another translated page

Wrap its strings in `t()`, add the Urdu to `lib/ur.ts`, add `app/ur/<page>/` (copy `app/ur/tldr`), add the path to
`TRANSLATED` in `lib/i18n.ts`, and add `alternates.languages` to both layouts and the sitemap entry.
