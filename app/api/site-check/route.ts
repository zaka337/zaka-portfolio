import { scan } from "@/lib/sitepulse/scan";
import { ScanError } from "@/lib/sitepulse/types";

/* The server half of /tools/site-check: scans one public web address with the sitepulse scanner (lib/sitepulse, copied
   from the open-source package by scripts/sync-sitepulse.mjs) and answers with the report.

   A page that fetches whatever address a stranger types is a classic way into a private network, so this route adds
   nothing of its own to that risk: the scanner refuses private, local and reserved addresses (also when a name
   resolves to one, and at every redirect), refuses other schemes and ports, and caps size and time. This route never
   turns any of that off (no allowPrivate, no extra ports).

   On top of that: same-origin only, a per-visitor limit, and a cap on scans running at once, so one visitor cannot
   use the site to hammer someone else's server or to tie up this one. The limits are per server instance (best
   effort, like the contact form's), which is enough to stop casual abuse. Nothing is stored or logged but the count. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const WINDOW_MS = 10 * 60 * 1000;
const PER_VISITOR = 8; // scans per window
const AT_ONCE = 4; // scans running on this instance at the same moment

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > PER_VISITOR;
}
let running = 0;

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** What a visitor is told for each reason an address is refused */
const REFUSAL: Record<string, string> = {
  "invalid-url": "That does not look like a web address. Try something like example.com.",
  "bad-protocol": "Only http:// and https:// addresses can be checked.",
  "credentials-in-url": "Addresses with a user name or password in them are not accepted.",
  "port-not-allowed": "Only the standard web ports (80 and 443) can be checked.",
  "blocked-host": "That is a local or private address. Only public websites can be checked here.",
  "blocked-address": "That address is on a private or reserved network. Only public websites can be checked here.",
  "too-many-redirects": "That address redirects too many times.",
};

export async function POST(request: Request) {
  // Same-origin only
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "forbidden" }, 403);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return json({ error: "rate_limited", message: "That is a lot of checks in a short time. Please wait a few minutes and try again." }, 429);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid", message: REFUSAL["invalid-url"] }, 400);
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || url.length > 2048) return json({ error: "invalid-url", message: REFUSAL["invalid-url"] }, 400);

  if (running >= AT_ONCE) return json({ error: "busy", message: "The checker is busy right now. Please try again in a few seconds." }, 503);
  running++;
  try {
    const report = await scan(url, { timeoutMs: 5000, budgetMs: 12000, maxLinks: 10, signal: request.signal });
    return json({ ok: true, report });
  } catch (e) {
    if (e instanceof ScanError) return json({ error: e.code, message: REFUSAL[e.code] ?? e.message }, e.code === "aborted" ? 499 : 400);
    console.error("site-check: unexpected failure", e instanceof Error ? e.message : String(e));
    return json({ error: "failed", message: "Something went wrong while checking that address. Please try again." }, 500);
  } finally {
    running--;
  }
}
