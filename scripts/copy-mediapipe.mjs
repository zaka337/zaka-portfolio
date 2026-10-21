/* Look back (the camera feature) runs Google's MediaPipe face tracker entirely in the visitor's
   browser. Its engine (WebAssembly) is served from this site rather than from a CDN, so nothing
   about a visitor is sent to a third party. The engine files come from the npm package, so they
   are copied into public/ at build time (and ignored by git) instead of being committed twice.
   The model, public/mediapipe/face_landmarker.task, is committed: see public/mediapipe/README.txt. */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "mediapipe", "wasm");

// A browser needs only one of these pairs: the SIMD one on any recent phone or laptop,
// the other on older ones. It picks by itself.
const files = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

if (!existsSync(from)) {
  console.warn("copy-mediapipe: @mediapipe/tasks-vision is not installed, skipping (the camera feature will not load its engine)");
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const f of files) copyFileSync(join(from, f), join(to, f));
console.log(`copy-mediapipe: ${files.length} engine files -> public/mediapipe/wasm`);
