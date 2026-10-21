/* The words on /backstage, the page that opens when a visitor has found all of the hidden things
   (lib/secrets.ts). Edit them freely: this file is the only place they live. */

/** A note from Zaka, shown first. One string per paragraph. */
export const NOTE: string[] = [
  "You went through the terminal, the camera, the lamp and all the rest. Most people never get past the title.",
  "That is the kind of person I like working with: someone who opens the thing that was not labelled.",
  "If you are building something, hiring, or just want to say you made it this far, I would like to hear from you.",
];

/** How each hidden thing works, by secret id (the names come from lib/secrets.ts). */
export const MAKING: Record<string, string> = {
  title: "Every letter of the title becomes a body in a small physics engine written for this site. It steps a fixed 240 times a second, so it behaves the same on a 60 Hz screen and a 120 Hz one.",
  head: "The face is a 3D model drawn with three.js. Hold it, turn it, let go, and it settles back on a spring.",
  terminal: "A command line built into the page, with no library behind it. help lists what works. A few things it does not list.",
  hire: "A pretend sudo prompt. The only thing it ever grants is a way to reach me.",
  crumble: "rm -rf / is run safely: every block of the page is lifted into the same physics world and falls. Nothing is deleted, and a reload puts it all back.",
  xray: "The blueprint is drawn from the page's real layout, measured live, not from a picture of it.",
  talk: "The listening and the voice are your browser's own. There is no AI behind the answers: it is keyword matching over this site's own content, so it can only say true things about me.",
  camera: "Face tracking runs in your browser (Google's MediaPipe). The picture is never recorded or uploaded, and the avatar only copies your head turns, nods and tilts.",
  tilt: "Phones report which way is down, so the fallen letters slide with the phone. On a computer, the space bar moves them too.",
  lamp: "Dark mode with the lights off and a lamp you steer with the pointer, a finger, or the tilt of the phone.",
  tour: "A walk around the site that only ever opens this site's own pages, and ends the moment you go anywhere yourself.",
  proof: "The button asks a server to check the live site and the code right now. The first time it ran, it scored this portfolio 1 out of 6 on security headers, so that got fixed. It is 6 out of 6 now.",
};
