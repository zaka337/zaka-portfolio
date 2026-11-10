# The multi-cursor build of the home screen

On the first visit of a session, five labelled cursors (Next.js, React, TypeScript, Three.js, CSS) assemble the home screen from the
top down, draw the avatar's head in ink while it finishes loading, take hold of the head's frame together, and on their shared click
the real head dissolves in through the sketch. The cursors then turn back into the site's own full stop and leave.

## When it plays

| Case | Result |
|---|---|
| First visit of a session (the layout's head script has not added `zk-skip`) | plays once |
| Reload, or coming back to `/` in the same session | no build (the loader is skipped too) |
| `/?build` (any value, or none) | plays again: the replay link, and the test switch |
| `rebuild` in the hidden terminal (`` ` `` key) | plays again, from any page |
| Reduced motion, the "calm" setting, Save-Data | never; the finished page at once |
| Crawlers and speed testers (UA has bot, crawl, spider, lighthouse, pagespeed, gtmetrix, pingdom, prerender) | never |
| Phone layout (<= 768 px) and in-app browsers (Instagram, LinkedIn, ...) | the short version: three cursors, about 5 seconds |
| Any click, key, wheel or touch while it runs | skips to the finished page in about half a second |

Address switches: `&t=2.4` freezes it at that second (any frame can be drawn on demand), `&speed=0.5` is slow motion, `&lite=1` is the
phone version on a desktop.

## How it works

- `app/page.tsx`: an inline script that runs before the first paint decides whether to arm the build (adds `html.zb`), so the home never
  flashes in its final state. If the build has not started within 5 seconds the page is shown as it is. Also loads `HomeBuildLoader`.
- `components/homebuild/HomeBuildLoader.tsx`: loads the build after the page, inside a `Guard` (like the other extras).
- `components/homebuild/HomeBuild.tsx`: the layer markup, and when to start (first visit, `?build`, `zk-rebuild`).
- `components/homebuild/director.ts`: the choreography. One timeline that is a pure function of time (`render(t)`); the plan tables
  `DESKTOP` and `LITE` at the top say who does what and when. It only writes inline styles to existing elements (all removed again in
  `finish()`), with the CSS `translate`/`scale`/`rotate` properties because several blocks already use `transform`.
- `components/homebuild/build.css`: every rule starts with `html.zb` or `.zb-`, so nothing applies to another page or another visit.
- `components/homebuild/faceLines.ts`: **generated** by `scripts/bake-face-lines.mjs` from `public/face-still.webp` (a render of the
  avatar's own head): silhouette, Canny edges (cap seams, logo, brows, eyes, nose, mouth, ears), iris rings, hatching by darkness
  (beard, cap), the black brim. Change the picture, run `node scripts/bake-face-lines.mjs preview.png`, look at the preview.
- `lib/homeBuild.ts` + the `rebuild` command in `components/Terminal.tsx`.

## Smoothness (measured, and why it works the way it does)

- The director is time-based (identical at 60 and 120 Hz), writes only transforms, opacity and clip-path, looks every DOM node up once,
  skips style writes whose value did not change, and finished tracks return at once: about 1 ms per frame at the 95th percentile.
- The 3D head freezes the page in waves while its shaders compile and its textures upload (130 ms, then 200-400 ms, then 100 ms, over the
  first ~2.5 s; measured on an Intel Iris Xe). No choreography stays smooth through that, so the build starts only once the head
  reports ready (`data-ready`) plus a 280 ms settle, capped at 3.5 s so a slow device still gets its intro. Until then the loader
  covers the page, as it always has.

## Sound

The build has sound, through the site's own synthesised-sound engine (`lib/sound.ts`, `cue()`; no audio files). Rules:

- **Off unless the visitor turned it on** (`sound` in the terminal, or the button below). Nothing is created, downloaded or heard otherwise.
- **A browser only starts audio after a tap or key press**, and the build starts by itself on a first visit. So when the choreography
  really starts (the director dispatches `zk-build-play` once the loader is gone) `HomeBuild.tsx` offers a small "Tap for sound" button,
  unless the audio is already awake. The tap runs `setSound(true)` (that is what lets the browser start audio, and it is remembered),
  does NOT skip the build (the director ignores presses on `.zb-sound`), and the rest of the build is heard. The button is gone when the build ends.
- **The score** is a list of cues laid out once from the same plan tables as the visuals (`cu(...)` calls in `director.ts`) and fired as the
  timeline passes them (`fireCues`): each cursor arrives with a blip, every ripple is a soft click, pencil scratches follow each face
  stroke (two long-lived noise "pen voices", re-automated per stroke, so no audio nodes are created in the animation loop), a marker sweep for the
  cap's brim, quiet keys for typed text, a paper slide for each block, the five cursors grab the head's frame, the shared click is one soft
  C major chord with a low thump, the head arrives with a rising sweep and four bright notes, the head says hello (not at night), and the cursors
  turn back into full stops with a tiny pip each. Each cursor owns one note of the chord (`NOTE` in `director.ts`), so any combination is consonant.
- **Silent when**: frozen (`?build&t=`), skipping (the cue pointer advances without playing), reduced motion or calm mode (no build), pre-roll.
- **Measured** (`D:\Projects\Zaka_Promo\_tmp\sound-test.cjs`, an AnalyserNode tapped onto the speakers): silent when off, nothing before the
  choreography, audible through the build, peak about 0.3 (no clipping), loudest at the finale. `sound-perf.cjs`: sound adds about 0.3 ms to
  the director's mean per frame (p95 1 -> 3 ms of a 16 ms frame) and changes no frame pacing or long-task count.
- **Not verified**: how it SOUNDS (taste). Gains are in `cue()` in `lib/sound.ts` and are easy to change. iPhones stay silent when the ringer switch is off.
- The site's other features have their own sounds when sound is on (e.g. the kinetic "FULL-STACK DEVELOPER" block in `RoleType.tsx`).

## Safety

If anything fails (a script error, the chunk not loading, the scene missing), `finish()` removes every inline style and class it added
and the page is the normal home. A watchdog ends a stuck run. The 3D head is never held back by the build. At night in Islamabad
(`isNight()` in `lib/sleep.ts`) the head nods off, so the awake sketch fades out quickly and nobody says hello to a sleeper.

## Testing

Browser tests live outside the repo in `D:\Projects\Zaka_Promo\_tmp`: `build-proto.cjs` (frames, phone, reduced motion, real run, skip,
slow 3D, no 3D, the finished layout equals the plain home), `build-int.cjs` (first visit, reload, terminal replay, crawler, replay
link), `build-perf.cjs` (frame pacing and long tasks; `GPU=1` for the real GPU), `build-vitals.cjs` (LCP, CLS and blocking time with
and without the build), `head-fit.cjs` (where the real head sits, for the sketch's calibration). Set the clock to 12:00 in Islamabad
in tests, or the sleeping head ruins comparisons. Use one browser per run (software GL).

## Remove it

Delete the `<script>` and `<HomeBuildLoader />` from `app/page.tsx`, the `rebuild` branch in `components/Terminal.tsx`, then
`components/homebuild/`, `lib/homeBuild.ts` and `scripts/bake-face-lines.mjs`.
