import { NEEDS, TIMELINES, MAX_MESSAGE } from "@/lib/contactForm";

/* Receives the project brief and emails it to the site owner through Resend.
   Needs RESEND_API_KEY. Optional: CONTACT_TO, CONTACT_FROM, RESEND_API_URL (for tests).
   If the key is missing it answers 503, and the form falls back to the visitor's mail app. */

const TO = process.env.CONTACT_TO ?? "zakas2379@gmail.com";
// onboarding@resend.dev only delivers to the Resend account owner's own address,
// which is exactly this setup. Use a verified domain address for anything else.
const FROM = process.env.CONTACT_FROM ?? "Portfolio contact form <onboarding@resend.dev>";
const API = process.env.RESEND_API_URL ?? "https://api.resend.com/emails";

// Best-effort per-instance limiter: 5 messages per IP per 10 minutes.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some((t) => now - t < 10 * 60 * 1000)) hits.delete(k);
  return recent.length > 5;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  // Same-origin only
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "forbidden" }, 403);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }

  // Honeypot and "filled in too fast" are bots: pretend success, send nothing.
  const elapsed = Number(data.elapsed ?? 0);
  if (typeof data.website === "string" && data.website.trim() !== "") return json({ ok: true });
  if (elapsed > 0 && elapsed < 2500) return json({ ok: true });

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const timeline = typeof data.timeline === "string" ? data.timeline : "";
  const needs = Array.isArray(data.needs) ? data.needs.filter((n): n is string => typeof n === "string" && NEEDS.includes(n)).slice(0, NEEDS.length) : [];

  if (!name || name.length > 80) return json({ error: "invalid", field: "name" }, 400);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120) return json({ error: "invalid", field: "email" }, 400);
  if (!message || message.length > MAX_MESSAGE) return json({ error: "invalid", field: "message" }, 400);
  if (timeline && !TIMELINES.includes(timeline)) return json({ error: "invalid", field: "timeline" }, 400);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  const needsText = needs.length ? needs.join(", ") : "Not sure yet";
  const subject = `Project inquiry: ${needs.length ? needs.join(", ") : "General"} (${name})`.slice(0, 180);
  const text = [`New message from your portfolio`, "", `Name: ${name}`, `Email: ${email}`, `Needs: ${needsText}`, `Timeline: ${timeline || "Not sure yet"}`, "", message].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
    <p style="margin:0 0 12px"><strong>New message from your portfolio</strong></p>
    <table style="font-size:14px;margin-bottom:16px"><tr><td style="padding:2px 12px 2px 0;color:#666">Name</td><td>${esc(name)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#666">Email</td><td>${esc(email)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#666">Needs</td><td>${esc(needsText)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#666">Timeline</td><td>${esc(timeline || "Not sure yet")}</td></tr></table>
    <div style="white-space:pre-wrap;border-left:3px solid #111;padding-left:12px">${esc(message)}</div></div>`;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject, text, html }),
    });
    if (!res.ok) {
      console.error("contact: email provider rejected the request", res.status);
      return json({ error: "send_failed" }, 502);
    }
    return json({ ok: true });
  } catch {
    console.error("contact: email provider unreachable");
    return json({ error: "send_failed" }, 502);
  }
}
