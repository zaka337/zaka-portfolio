/* Collect them all. The portfolio hides a dozen things; this remembers which ones a visitor has
   found (in their own browser only, nothing is sent anywhere), tells them when they find one
   (components/SecretToast.tsx), lists them in the secret terminal (`secrets`), and when all are
   found, opens /backstage.

   Each feature calls found("id") at the moment it first really happens. The hints are
   deliberately vague: they are nudges, not instructions. */

export interface Secret {
  id: string;
  name: string;
  hint: string;
}

export const SECRETS: Secret[] = [
  { id: "title", name: "The falling title", hint: "Something on the home page does not like being poked." },
  { id: "head", name: "A head that spins", hint: "A face likes to be held. Then let go." },
  { id: "terminal", name: "The secret terminal", hint: "A key above Tab. Or hold a face very still." },
  { id: "hire", name: "Access granted", hint: "Ask the terminal nicely, with sudo." },
  { id: "crumble", name: "rm -rf /", hint: "The most dangerous command, run safely." },
  { id: "xray", name: "Paper X-ray", hint: "Shift is for blueprints. Try X." },
  { id: "talk", name: "A conversation", hint: "The avatar can answer out loud." },
  { id: "camera", name: "Look back", hint: "It can copy you, if you let it see you." },
  { id: "tilt", name: "Gravity", hint: "Fallen letters move with a phone, or with the space bar." },
  { id: "lamp", name: "Lamp mode", hint: "Dark mode has a darker side." },
  { id: "tour", name: "The whole tour", hint: "Sixty seconds, start to finish." },
  { id: "proof", name: "Proof", hint: "Projects can be checked while you watch." },
];

const KEY = "zk-secrets";
let session: string[] | null = null; // for browsers that refuse storage: still counts this visit

const known = (id: string) => SECRETS.some((s) => s.id === id);

export function foundList(): string[] {
  if (typeof window === "undefined") return [];
  if (session) return session;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    session = Array.isArray(raw) ? raw.filter((id: unknown): id is string => typeof id === "string" && known(id)) : [];
  } catch {
    session = [];
  }
  return session;
}

/** Call at the moment a hidden thing really happens. Does nothing the second time. */
export function found(id: string) {
  if (typeof window === "undefined" || !known(id)) return;
  const list = foundList();
  if (list.includes(id)) return;
  list.push(id);
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage refused */ }
  window.dispatchEvent(new CustomEvent("zk-secret", { detail: { id, count: list.length, total: SECRETS.length } }));
}

export const allFound = () => foundList().length >= SECRETS.length;
