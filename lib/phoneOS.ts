/* The little phone "operating system" behind the phones on the contact page
   (components/phones/*). Every phone shows the same apps, which are all real ways to reach Zaka or
   see his work; only the look and the way they open differ from phone to phone. */

import { SOCIAL } from "@/lib/site";

export type PhoneId = "nokia" | "iphone" | "pixel" | "nothing";
export type Skin = "iphone" | "pixel" | "nothing";

export const PHONES: { id: PhoneId; label: string; hint: string }[] = [
  { id: "nokia", label: "Nokia 3310", hint: "PRESS A KEY · 2 / 8 SCROLL · RED KEY BACK" },
  { id: "iphone", label: "iPhone", hint: "TAP TO UNLOCK · TAP AN APP · TAP THE BAR FOR HOME" },
  { id: "pixel", label: "Pixel", hint: "TAP TO UNLOCK · TAP AN APP · TAP THE PILL FOR HOME" },
  { id: "nothing", label: "Nothing", hint: "TAP TO UNLOCK · TAP AN APP · TAP THE DOT FOR HOME" },
];

export const isPhoneId = (v: unknown): v is PhoneId => PHONES.some((p) => p.id === v);

export type AppId = "mail" | "whatsapp" | "linkedin" | "github" | "instagram" | "projects" | "resume" | "snake" | "clock" | "book" | "qa";

export interface AppDef { id: AppId; label: string; title: string }

export const APPS: AppDef[] = [
  { id: "mail", label: "Mail", title: "Write to Zaka" },
  { id: "whatsapp", label: "WhatsApp", title: "WhatsApp" },
  { id: "linkedin", label: "LinkedIn", title: "LinkedIn" },
  { id: "github", label: "GitHub", title: "GitHub" },
  { id: "instagram", label: "Instagram", title: "Instagram" },
  { id: "projects", label: "Projects", title: "Projects" },
  { id: "resume", label: "Resume", title: "Resume" },
  { id: "snake", label: "Snake", title: "Snake" },
  { id: "clock", label: "Clock", title: "World clock" },
  { id: "book", label: "Call", title: "Book a call" },
  { id: "qa", label: "QA", title: "QA challenge" },
];

export const app = (id: AppId) => APPS.find((a) => a.id === id)!;

/* The four apps along the bottom, and the rest on the home screen */
export const DOCK: AppId[] = ["mail", "whatsapp", "book", "projects"];
export const HOME: AppId[] = ["linkedin", "github", "instagram", "resume", "snake", "clock", "qa"];

export const PROFILE: Partial<Record<AppId, { name: string; handle: string; url: string; blurb: string; cta: string }>> = {
  linkedin: { name: "Zaka Ullah Waheed", handle: "linkedin.com/in/zaka-ullah-waheed", url: SOCIAL.linkedin, blurb: "Full-stack developer and QA automation engineer. Open to remote work.", cta: "Open profile" },
  github: { name: "zaka337", handle: "github.com/zaka337", url: SOCIAL.github, blurb: "The code behind every project here, public and open to read.", cta: "Open GitHub" },
  instagram: { name: "notxzaka", handle: "@notxzaka", url: SOCIAL.instagram, blurb: "Behind the screen, outside the code editor.", cta: "Open Instagram" },
};

export const EMAIL = SOCIAL.email;

/* How a swipe is read: far enough, and mostly in one direction */
export function swipeDir(dx: number, dy: number, min = 18): "up" | "down" | "left" | "right" | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}
