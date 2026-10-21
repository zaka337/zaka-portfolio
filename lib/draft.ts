/* A message handed from one page to the contact form (/contact-me): the job-fit checker, the
   meeting helper and the estimator each write a ready-made brief, and the form picks it up and
   fills itself in. It travels in this tab's session storage, never in the address, so nothing the
   visitor typed ends up in a URL, a history entry or a log. The form shows where it came from, and
   everything stays editable. */

export interface Draft {
  from: string;          // "job-fit check", "call request", "project estimate"
  message: string;
  needs?: string[];
  timeline?: string;
}

const KEY = "zk-draft";

export function saveDraft(d: Draft) {
  try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage refused: the form simply opens empty */ }
}

/** Read it once; it is gone afterwards */
export function takeDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const d = JSON.parse(raw) as Draft;
    return typeof d?.message === "string" ? d : null;
  } catch {
    return null;
  }
}
