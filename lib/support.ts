/* The "support the game" link on the MINI MAYHEM results screen (components/mayhem/MiniMayhem.tsx). It is a plain
   link to a free tip page (Ko-fi, Buy Me a Coffee, PayPal.me, GitHub Sponsors or similar) and it only exists
   once the site owner sets one address in Vercel (Settings, Environment Variables) and redeploys:

     NEXT_PUBLIC_SUPPORT_URL   like  https://ko-fi.com/yourname

   Nothing is loaded from that service until a visitor chooses to follow the link. An address that is missing, not
   https, or not a real web address means no link. The steps are in docs/ADS.md. */

export const SUPPORT_URL = (() => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPPORT_URL ?? "");
    return u.protocol === "https:" && u.hostname.includes(".") && !u.username && !u.password ? u.toString() : "";
  } catch {
    return "";
  }
})();
export const supportEnabled = SUPPORT_URL !== "";
