/* The ad space in the MINI MAYHEM game area (components/mayhem/GameAd.tsx). It is OFF until the site owner
   adds two settings in Vercel (Settings, Environment Variables) and redeploys:

     NEXT_PUBLIC_ADS_CLIENT   the AdSense publisher id, like  ca-pub-1234567890123456
     NEXT_PUBLIC_ADS_SLOT     the ad unit id, like  1234567890

   With either missing, or not shaped like that, nothing here does anything: no ad space is drawn, no
   script from another company is loaded, and the site's security rules stay as strict as ever.
   The setup steps (domain, AdSense account, consent) are in docs/ADS.md. */

export const ADS_CLIENT = process.env.NEXT_PUBLIC_ADS_CLIENT ?? "";
export const ADS_SLOT = process.env.NEXT_PUBLIC_ADS_SLOT ?? "";
export const adsEnabled = /^ca-pub-\d{10,20}$/.test(ADS_CLIENT) && /^\d{6,20}$/.test(ADS_SLOT);
export const ADS_SCRIPT = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;

/* Where a visitor must say yes before any ad script loads: the EU and EEA, the UK and Switzerland. When
   the country cannot be told (a local test, a private network) the answer is also to ask first. */
const ASK_FIRST = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
]);
export const askFirst = (country: string) => country === "" || ASK_FIRST.has(country.toUpperCase());
