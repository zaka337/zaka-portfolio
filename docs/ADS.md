# Ads in the game area

The MINI MAYHEM game has one ad space, built and **switched off**. Nothing is drawn, no script from another company is
loaded and the site's security rules are unchanged until you add two settings (below). This file is the checklist for
turning it on, and the honest expectations.

## Where it shows

- On the game's **title screen** and **results screen** (after a race). Never while racing, never on the driver screen.
- Labelled "ADVERTISEMENT". An ad that is not filled closes the space up.
- Nowhere else on the site. The portfolio pages stay ad-free.

## What to expect (be realistic)

- Earnings follow traffic. A portfolio game with a few hundred plays a month earns cents to a few dollars a month,
  not a living. It is worth it only if the game gets real traffic.
- A game page is mostly a canvas with little text. AdSense reviews pages for "enough content" and sometimes refuses
  those. The portfolio's other pages and the privacy page help, but approval is not guaranteed.
- Ads from another company mean cookies and a slightly slower page. That is why the site asks first in Europe, the UK
  and Switzerland, and why `/privacy` explains it.
- If the goal is money from the game itself, also consider game portals (CrazyGames, Poki, itch.io): they host the
  game, bring the players and share revenue. This ad space does not stop you from doing that.

## Turning it on

1. **Get a domain you own** (about $10 a year) and attach it to the Vercel project. AdSense generally cannot approve a
   free `*.vercel.app` address because it checks ownership of the whole domain. Then set `NEXT_PUBLIC_SITE_URL` in
   Vercel to the new address so the canonical links, sitemap and structured data follow it.
2. **Sign up for Google AdSense** with that domain and add the site. Complete the verification it asks for. The site
   already serves `/ads.txt` by itself once step 4 is done, and has a `/privacy` page (AdSense requires one).
3. **Wait for approval** (days to weeks).
4. In AdSense create a **display ad unit** and copy two numbers. In Vercel, Settings, Environment Variables
   (Production), add:
   - `NEXT_PUBLIC_ADS_CLIENT` = the publisher id, like `ca-pub-1234567890123456`
   - `NEXT_PUBLIC_ADS_SLOT` = the ad unit id, like `1234567890`

   Redeploy. These two are baked in at build time, so a redeploy is what switches it on.
5. In AdSense, turn on **Privacy and messaging** for the EEA and the UK, so Google's own consent notice covers the
   cases the site's "Allow ads" question does not.
6. Open `/mini-mayhem` in a normal browser window (no ad blocker) and look at the title screen. New ad units can take
   a while to start filling. If the space stays empty, open the browser's developer console: a line starting with
   "Refused to ... because it violates the following Content Security Policy" names the missing host. Add it to
   `AD_HOSTS` in `next.config.ts`.

## Rules to keep

- Never click your own ads or ask anyone to. That gets an AdSense account closed.
- Do not put the ad close to a button or over the game; keep the space where it is.
- Keep `/privacy` true. It says what the code does; change it if the code changes.

## Free option: a "support the game" link (no domain, no ad account)

If you cannot pay for a domain, the game can show an optional link on its **results screen**: "Enjoyed the game? Support it".
It is a plain link to a free tip page (Ko-fi, Buy Me a Coffee, PayPal.me, GitHub Sponsors or similar), so nothing loads from
that service unless a visitor follows it. Check which of those can pay out to you where you live before you pick one.

1. Create your free tip page and copy its https address.
2. In Vercel, Settings, Environment Variables (Production), add `NEXT_PUBLIC_SUPPORT_URL` with that address, and redeploy.
3. To remove it, delete the variable and redeploy. An address that is missing or not https shows no link.

## Turning it off

Delete the two environment variables in Vercel and redeploy. Everything returns to how it was: no ad space, no
third-party script, strict security rules everywhere.

## Where the code is

| File | What it does |
|---|---|
| `lib/ads.ts` | reads the two settings, decides whether ads are on, lists the countries that must be asked first |
| `components/mayhem/GameAd.tsx` | the ad space: asks first where needed, remembers the answer, loads the script, closes up if unfilled |
| `app/api/region/route.ts` | tells the page the visitor's country (from Vercel's header) so it knows whether to ask |
| `app/ads.txt/route.ts` | `/ads.txt`, built from the publisher id (404 while ads are off) |
| `next.config.ts` | when ads are on, the game page alone also allows Google's ad servers |
| `lib/support.ts` | reads `NEXT_PUBLIC_SUPPORT_URL` for the support link (https only) |
| `app/privacy/page.tsx` | the privacy page |
| `components/mayhem/mayhem.css` | styles (`.mm-ad`) |
