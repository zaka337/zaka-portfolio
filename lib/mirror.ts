/* The visitor's head pose, shared between the camera (components/LookBack.tsx, which writes it)
   and the 3D avatar (components/AvatarScene.tsx, which reads it every frame to copy it).
   A plain object, not React state: it changes about thirty times a second. */

export const mirror = {
  on: false,       // the camera is mirroring right now
  weight: 0,       // 0..1, eased by the avatar so it glides into and out of copying
  yaw: 0,          // radians; positive turns toward the right of the screen, like the avatar's own
  pitch: 0,        // positive looks down
  roll: 0,         // positive tips the top of the head toward the left of the screen
};

/* The visitor's expression, each 0..1 and already eased: the camera (components/LookBack.tsx) writes it and
   the avatar's face director (components/face/life.ts) shows it while the camera is mirroring. Same six
   weights as components/face/expressions.ts. Mirror rule: the visitor's LEFT eye is the avatar's eye on the
   LEFT of the screen, as in a mirror (MediaPipe's "Left" is the person's own left). */
export const mirrorFace = { blinkL: 0, blinkR: 0, smile: 0, frown: 0, browUp: 0, browDown: 0, asym: 0 };
export type MirrorFace = typeof mirrorFace;
export const resetMirrorFace = () => { for (const k of Object.keys(mirrorFace) as (keyof MirrorFace)[]) mirrorFace[k] = 0; };

/** MediaPipe's blendshape scores, by name (eyeBlinkLeft, mouthSmileRight, browInnerUp ...) */
export type Blend = Record<string, number>;
export const toBlend = (cats: { categoryName: string; score: number }[] | undefined): Blend => {
  const b: Blend = {};
  if (cats) for (const c of cats) b[c.categoryName] = c.score;
  return b;
};
const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

/** The six weights for what the face is doing now. `n` is the same person's resting face (looking at the screen),
    so a naturally squinty or smiley face does not count as an expression. */
export function expressionFromBlend(b: Blend, n: Blend): MirrorFace {
  const d = (k: string) => (b[k] ?? 0) - (n[k] ?? 0);
  const smileL = d("mouthSmileLeft"), smileR = d("mouthSmileRight");
  const smile = ramp((smileL + smileR) / 2, 0.06, 0.55);
  return {
    blinkL: ramp(b.eyeBlinkLeft ?? 0, Math.max(0.2, (n.eyeBlinkLeft ?? 0) + 0.12), 0.65),
    blinkR: ramp(b.eyeBlinkRight ?? 0, Math.max(0.2, (n.eyeBlinkRight ?? 0) + 0.12), 0.65),
    smile,
    asym: smile > 0.15 ? Math.max(-1, Math.min(1, (smileL - smileR) * 2.2)) : 0,
    frown: ramp((d("mouthFrownLeft") + d("mouthFrownRight")) / 2, 0.08, 0.5),
    browUp: Math.max(ramp(d("browInnerUp"), 0.08, 0.5), ramp((d("browOuterUpLeft") + d("browOuterUpRight")) / 2, 0.08, 0.5)),
    browDown: ramp((d("browDownLeft") + d("browDownRight")) / 2, 0.1, 0.5),
  };
}

const asin = (v: number) => Math.asin(Math.max(-1, Math.min(1, v)));

/* The face tracker (MediaPipe Face Landmarker) gives a 4x4 matrix for where the head is. These
   three entries were calibrated by rendering this very avatar at known angles and by rotating a
   picture of it, rather than guessed:
     data[2]  turn:  positive when the face turns toward the left of the camera's picture, which is
                     the visitor's own right, so the avatar turning to the right of the screen is
                     what a mirror shows;
     data[6]  nod:   positive when the head looks down;
     data[4], data[1]  tilt: positive when the picture of the face is rotated clockwise, which is
                     the visitor's left shoulder, and the avatar's top then goes to the left of
                     the screen. */
export function poseFromMatrix(d: ArrayLike<number>) {
  return {
    yaw: asin(d[2]),
    pitch: asin(d[6]),
    roll: asin((d[4] - d[1]) / 2),
  };
}
