/* Tells the game's ad space which country the visitor is in, so it knows whether to ask before it shows an
   ad (lib/ads.ts askFirst). Vercel puts the country in a request header; nothing is stored or logged here.
   Only the game calls this, and only when ads are switched on. Not cached: it answers per visitor. */

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const country = (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase().slice(0, 2);
  return Response.json({ country }, { headers: { "Cache-Control": "no-store" } });
}
