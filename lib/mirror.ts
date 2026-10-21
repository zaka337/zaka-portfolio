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
