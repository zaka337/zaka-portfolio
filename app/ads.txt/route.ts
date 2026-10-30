/* ads.txt: the public list that tells ad buyers which seller may sell this site's ad space. Google AdSense
   asks for it at /ads.txt. It is built from the publisher id in NEXT_PUBLIC_ADS_CLIENT (lib/ads.ts); with
   no id set there is no such page (404), as there is no ad space. f08c47fec0942fa0 is Google's own id. */

export function GET() {
  const m = /^ca-(pub-\d{10,20})$/.exec(process.env.NEXT_PUBLIC_ADS_CLIENT ?? "");
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(`google.com, ${m[1]}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
