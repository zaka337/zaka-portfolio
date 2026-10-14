/* Shared by the contact form (client) and /api/contact (server). */

export const NEEDS = ["Website", "Web app", "Mobile app", "QA & test automation", "AI & automation", "Something else"];
export const TIMELINES = ["ASAP", "1-3 months", "Flexible"];
export const MAX_MESSAGE = 1200;

export interface ContactPayload {
  name: string;
  email: string;
  needs: string[];
  timeline: string;
  message: string;
  website: string; // honeypot, must stay empty
  elapsed: number; // ms the form was open, a cheap bot signal
}

export type SendResult = "sent" | "unavailable" | "invalid";

/* "unavailable" means the server could not send (not configured, provider down,
   offline): the caller should fall back to the visitor's own mail app. */
export async function sendContact(payload: ContactPayload): Promise<SendResult> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return "sent";
    if (res.status === 400) return "invalid";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
