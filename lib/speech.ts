/* The voice the site speaks with: the talking avatar (components/Voice.tsx) and the reading toolbar
   (components/Access.tsx). It is the visitor's own browser voice, so the best we can do is pick the
   nicest English one their device has. Ranked, highest score wins:
     - neural / "Natural" voices (Edge) and "Premium" / "Enhanced" voices (Apple) sound the most human
     - Chrome's "Google ... English" voices are smooth but online only, and Chrome cuts them off after
       about 15 seconds, so they rank lower for long reading
     - the plain built-in voices come last, and the deep robotic ones (David, Mark, Fred) very last
   A female voice is preferred: the male built-in voices were the ones people disliked. */

const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|princess|ralph)\b/i;
const FEMALE = /\b(female|aria|jenny|sonia|zira|hazel|libby|susan|samantha|ava|allison|serena|karen|moira|tessa|victoria|zoe|joanna|salli|kimberly|emma|olivia|amy|natasha|clara|michelle|heera|neerja|ana|eva)\b/i;
const MALE = /\b(male|david|mark|guy|ryan|george|james|daniel|alex|aaron|arthur|oliver|rishi|thomas|gordon|lee|prabhat|ravi|brian|eric|davis|christopher)\b/i;

function score(v: SpeechSynthesisVoice, online: boolean, long: boolean): number {
  const n = v.name;
  if (NOVELTY.test(n)) return -100;
  const remote = v.localService === false;
  if (remote && !online) return -50; // a network voice cannot speak without a network
  let s = 30;
  if (/natural|neural/i.test(n)) s = 100;
  else if (/premium|enhanced/i.test(n)) s = 70;
  else if (/google (us|uk) english/i.test(n)) s = long ? 25 : 60;
  if (FEMALE.test(n)) s += 20;
  else if (MALE.test(n)) s -= 60;
  if (/^en[-_](us|gb)/i.test(v.lang)) s += 5;
  return s;
}

/** The nicest English voice this device has, or null for "let the browser choose".
 *  `long`: the text is a whole page read aloud, not one short sentence. */
export function pickVoice(long = false): SpeechSynthesisVoice | null {
  const all = typeof window !== "undefined" ? window.speechSynthesis?.getVoices?.() ?? [] : [];
  const en = all.filter((v) => /^en[-_]/i.test(v.lang));
  if (!en.length) return null;
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  let best = en[0], top = -Infinity;
  for (const v of en) {
    const s = score(v, online, long);
    if (s > top) { top = s; best = v; } // the first of equals wins, so the device's own order breaks ties
  }
  return best;
}
