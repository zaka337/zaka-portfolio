# llmcheck page (/tools/llmcheck)

An explainer for **llmcheck**, an open-source test runner for AI features (a YAML suite, repeated runs, a pass rate, flaky-answer detection, JUnit/Markdown/JSON reports, any OpenAI-compatible endpoint). The tool itself lives outside this repository, in `D:\Projects\llmcheck` (Python, MIT, 169 tests); this page only describes it.

| Piece | File |
|---|---|
| The page (server rendered) | `app/tools/llmcheck/page.tsx` |
| Extra styles (code blocks) on top of the shared `sv-*` ones | `components/tools/llmcheck.css`, `components/services/services.css` |
| The publish switch | `lib/sitepulseLinks.ts`, `LLMCHECK.published` |
| The offer it backs | `lib/services.ts`, id `ai-quality` |

## What on the page is real

- The YAML sample and the report sample are copied from the tool. The report is the **real output** of `llmcheck run examples/demo-suite.yaml` against the bundled demo assistant, which is a script that answers badly on purpose, not a language model. The page says so. If the tool's output format changes, re-run the demo and paste the new output (the UI test checks the totals line).
- The page makes no claim about how any real model performs. The suite for the QA with Zaka assistant (17 cases) is described as written and ready to run with your own key; it has not been run against the live model.

## When the package is published

`LLMCHECK.published` is **true** since 2026-11-06 (the repository `zaka337/llmcheck` is public; `pip install git+https://github.com/zaka337/llmcheck` was tried in a clean virtualenv before the switch). While it was false the page linked nowhere and said the tool is "being published". With it true the page shows the install command (`pip install git+https://github.com/zaka337/llmcheck`) and a GitHub link, and the structured data gains `codeRepository`. There is no PyPI link: publishing there is a separate step; add it only once it is true.

## Tests

`D:\Projects\Zaka_Promo\_tmp\llmcheck-page-ui.cjs` against a production build: sections, the code samples (backslashes intact), no premature links, internal links, the /services#ai-quality anchor, keyboard focus on the code blocks, and the phone layout (the page never scrolls sideways, the code blocks scroll inside themselves).
