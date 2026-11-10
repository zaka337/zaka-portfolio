# "Get drawn" (portrait in ink)

A visitor's face, drawn live in ink by the five cursors from the home screen (Next.js, React, TypeScript, Three.js, CSS), ending in a
1080 x 1350 card they can save or share. Everything runs in the visitor's browser.

## How a visitor finds it

- **Ctrl+K**: "Get drawn: your portrait in ink" (lib/palette.ts, id `portrait`).
- **Terminal** (hidden, not in `help`): `portrait`, `draw me`, `get drawn`, `drawme`. Plain `draw` is still the doodle.
- **Address** `/?portrait`: the card points there. It waits for the home loader and the home build to finish, so the two never fight.
- Any code can open it with `window.dispatchEvent(new Event("zk-portrait"))`.

## Privacy rules (do not weaken these)

- The camera is only asked for after a button press, with the privacy sentence already on screen. Opening the sheet never touches the camera.
- The camera is switched off the moment the picture is taken (and on Escape, close, hidden tab, route change). Tested.
- The picture is only read for the face and its light and dark, then its canvas is shrunk to 1x1. What stays in memory is the list of
  strokes, until the sheet is closed. Nothing is uploaded, stored, or put in the address. The CSP (`connect-src 'self'`) would block it anyway.
- No analytics events and no counters for this feature.
- The face tracker is the same self-hosted model and wasm as the camera mirror (public/mediapipe). It is downloaded only when someone starts.
- MediaPipe's engine tries to POST anonymous usage logs to `odml.pa.googleapis.com/v1/log` (found when the network test failed in dev, where
  there is no CSP). In production the CSP (`connect-src 'self'`) blocks it. `blockTrackerTelemetry()` in `components/portrait/tracker.ts`
  stops the attempt everywhere (fetch, XHR and sendBeacon to that one address only), so the privacy sentence is true by construction.
  The older camera mirror (`components/LookBack.tsx`) does not have this guard yet: it relies on the CSP alone.
- The test `portrait-int.cjs` asserts: same-origin requests only, no non-GET requests, camera tracks `ended` right after capture and on close.

## Files

| File | Job |
| --- | --- |
| `lib/portrait/strokes.ts` | landmarks + picture -> pen strokes in an 800 x 1000 space. Pure function, deterministic (seeded). |
| `lib/portrait/card.ts` | the card: 1080 x 1350 helpers shared by the live stage and the saved PNG (`renderCard`, `saveBlob`, `shareBlob`). |
| `components/portrait/tracker.ts` | loads the face tracker; `judgeFace` decides when the face is good enough to auto-capture. |
| `components/portrait/drawer.ts` | the timeline of the five cursors (a pure function of time, like `components/homebuild/director.ts`). |
| `components/portrait/Portrait.tsx` + `portrait.css` | the sheet: intro, camera preview, reading, stage, buttons, errors. |
| `components/portrait/PortraitLoader.tsx` | the only part on every page: waits for `zk-portrait` or `/?portrait`, then loads the sheet. |
| `app/ClientProviders.tsx` | mounts the loader inside a `Guard`. |

## How the drawing is made (strokes.ts)

1. Level the face by the eye line, scale it to the same size every time, centre it. A close-up and a far-away selfie give the same composition.
2. Lines come from the tracker's own connection sets: jaw (temple round the chin to the other temple), brows, eyelids, irises, lips; the nose, neck
   and shoulders are a few chosen landmarks (indices are in the file).
3. Shading is hatching where this picture is darker than THIS face's own light level (62nd percentile of the face, scaled by the face's own
   spread), so darker skin gets the same structure as lighter skin and beards, shadows, thick brows come out as ink without special cases.
   A band above the face is inked only where it is really dark (hair, a cap); the bar is higher there so a dark room behind a bald head
   does not become hair.
4. Three hatch layers (thresholds 0.9, 2.0, 3.2 standard deviations below skin). The strokes are split in two halves (top, bottom) for two cursors.

## The timeline (drawer.ts)

About 8.5 s (6.1 s on phones, factor `K`=0.72). Cursor roles: Next.js draws the card frame, then two construction lines (centre, eye level),
then the lower half of the shading; Three.js the jaw and nose; TypeScript the neck and shoulders, then types the caption; CSS brows, eyes,
irises, lips; React the upper half of the shading. The construction lines fade out at the end. Skip: click the card, or Space/Enter (9x).

## Test tricks

- `?zpt=4.2` on the page where the sheet opens freezes the drawing at 4.2 s; `?zpspeed=0.5` is slow motion. `window.__zp` is the draw handle
  (`seek(t)`, `time()`).
- Test scripts live outside the repo: `D:\Projects\Zaka_Promo\_tmp\portrait-lab` (`portrait-int.cjs` end to end with a fake camera built from
  the avatar picture, `frames.cjs` frames at fixed seconds, `lab.html` + `server.cjs` + `shot.cjs` the stroke lab, `variants.cjs` darker/tilted/small stand-ins).
- Honest limit: the only real face available for testing is the avatar's (and its darker, tilted and small variants). Glasses, long hair,
  hijab, heavy make-up and very dark rooms are not verified. If a real face comes out badly, the numbers to tune are in `strokes.ts`
  (`q(0.62)` skin level, thresholds `0.9 / 2.0 / 3.2`, hair-band factor `+0.9`, hair-band shape `1.08 / 1.3`).

## Removing it

Delete `components/portrait`, `lib/portrait`, the `PortraitLoader` lines in `app/ClientProviders.tsx`, the `portrait` item in `lib/palette.ts`
(and its branch in `components/Palette.tsx`), and the `portrait` command in `components/Terminal.tsx`.
