import { NextResponse } from "next/server";

/* "Message me on WhatsApp" without publishing the number.

   The site links to /whatsapp, and this route redirects to WhatsApp with a message already
   typed. The number lives only in the WHATSAPP_NUMBER environment variable (country code,
   digits only, e.g. 923001234567), so it is not in the page, the link or the public
   repository, and crawlers that read the HTML never see it.

   Honest limits: it is not secret. It appears in this redirect (visible in a browser's
   network tab) and WhatsApp shows it to anyone who opens the chat. It just is not
   displayed or scrapeable from the site itself.

   If the variable is missing or malformed, visitors go to the contact form instead of a
   dead end. */

export const dynamic = "force-dynamic";

const MESSAGE = "Hi Zaka, I found your portfolio and I'd like to talk about a project.";

export function GET(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow", // keep search engines from following it
  };

  const digits = (process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return NextResponse.redirect(new URL("/contact-me", request.url), { status: 302, headers });
  }

  return NextResponse.redirect(`https://wa.me/${digits}?text=${encodeURIComponent(MESSAGE)}`, {
    status: 302,
    headers,
  });
}
