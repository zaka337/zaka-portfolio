/* Bug hunt. A small ink bug wanders across each of seven pages now and then; tapping it squashes it
   ("BUG-004 closed"). This remembers which are squashed (in the visitor's own browser only, nothing
   is sent anywhere), says which page a bug belongs to, and tells the terminal's `bugs` command what
   to list. The walking and squashing is components/BugHunt.tsx. */

export interface Bug {
  id: string;
  no: string;          // BUG-001 ...
  name: string;        // what the terminal calls its home
  hint: string;        // what it says before the bug is found
}

export const BUGS: Bug[] = [
  { id: "home", no: "BUG-001", name: "the front door", hint: "somewhere the face lives" },
  { id: "about", no: "BUG-002", name: "the story", hint: "somewhere you scroll" },
  { id: "projects", no: "BUG-003", name: "the work", hint: "somewhere the projects are lined up" },
  { id: "case", no: "BUG-004", name: "a case study", hint: "somewhere inside a project" },
  { id: "brief", no: "BUG-005", name: "the brief", hint: "somewhere you tell me what you need" },
  { id: "resume", no: "BUG-006", name: "the paper copy", hint: "somewhere on the resume" },
  { id: "nokia", no: "BUG-007", name: "the old phone", hint: "somewhere you can play snake" },
];

/** Which bug lives on a page, if any */
export function bugFor(pathname: string): Bug | undefined {
  const p = pathname.replace(/\/+$/, "") || "/";
  let id: string | undefined;
  if (p === "/") id = "home";
  else if (p === "/about") id = "about";
  else if (p === "/projects") id = "projects";
  else if (p.startsWith("/projects/") && p !== "/projects/all") id = "case";
  else if (p === "/contact-me") id = "brief";
  else if (p === "/resume") id = "resume";
  else if (p === "/contact") id = "nokia";
  return BUGS.find((b) => b.id === id);
}

const KEY = "zk-bugs";
let session: string[] | null = null; // for browsers that refuse storage: still counts this visit

export function squashedList(): string[] {
  if (typeof window === "undefined") return [];
  if (session) return session;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    session = Array.isArray(raw) ? raw.filter((id: unknown): id is string => typeof id === "string" && BUGS.some((b) => b.id === id)) : [];
  } catch {
    session = [];
  }
  return session;
}

/** A bug was squashed. Returns how many are squashed now (counting this one once only). */
export function squash(id: string): number {
  const list = squashedList();
  if (!list.includes(id)) {
    list.push(id);
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage refused */ }
  }
  return list.length;
}
