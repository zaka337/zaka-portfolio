Look back (the camera feature) uses Google's MediaPipe Face Landmarker, running entirely in the
visitor's browser: the camera picture never leaves the device.

face_landmarker.task
  The Face Landmarker model, float16, version 1. Apache License 2.0, Copyright Google LLC.
  Source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
  Size: 3,758,596 bytes.

wasm/
  The engine (WebAssembly), copied from the npm package @mediapipe/tasks-vision (Apache License
  2.0) by scripts/copy-mediapipe.mjs when the site is built. Not committed.

Both are loaded only when a visitor turns the camera feature on.
