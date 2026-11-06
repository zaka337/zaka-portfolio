# Website health check (/tools/site-check)

A free tool: paste a web address, get a score and a fix for 35 checks of security headers, SEO, performance, accessibility and broken links. It runs the open-source **sitepulse** scanner (`D:\Projects\sitepulse`, published separately as an npm package, CLI and MCP server).

## How it fits together

| Piece | File |
|---|---|
| The scanner (copied, never edited here) | `lib/sitepulse/**` |
| The copy script | `scripts/sync-sitepulse.mjs` |
| The server route (POST) | `app/api/site-check/route.ts` |
| The page | `app/tools/site-check/{layout,page}.tsx`, `components/tools/SiteCheck.tsx`, `sitecheck.css` |
| Install/GitHub links switch | `lib/sitepulseLinks.ts` |

The browser cannot read another site's headers (CORS), so the page posts the address to `/api/site-check`, which runs the scan on the server and returns the report as JSON. The page only presents it. Nothing is stored; the only server-side memory is a counter per visitor for the rate limit.

## Changing the scanner

`lib/sitepulse/` is generated. Change the package, not the copy:

```bash
node scripts/sync-sitepulse.mjs            # copies ../sitepulse/src into lib/sitepulse (rewrites the import paths)
node scripts/sync-sitepulse.mjs --check    # exit 1 if lib/sitepulse is out of date
```

The checks, the score weights and, above all, the safety guard (`net/guard.ts`, `net/fetcher.ts`) therefore have one source of truth, and the page runs exactly what is published.

## Safety (read before touching the route)

A page that fetches whatever address a stranger types can be pointed at a private network. The defences are in the scanner and the route adds none of its own to weaken them:

- private, local and reserved addresses are refused, including disguised forms (`2130706433`, `0x7f000001`, `127.1`, IPv4-mapped IPv6, NAT64, 6to4) and names that *resolve* to private addresses (DNS rebinding: the name is resolved once, every address must be public, and the connection goes to exactly the address that was checked)
- every redirect is checked again; at most 5 are followed
- only `http` and `https`, only ports 80 and 443, no credentials in the URL
- response size is capped after decompression; every request and the whole scan have time limits; no cookies are sent
- the route never passes `allowPrivate` or `allowedPorts`. **Do not add them.** They exist for the command line, where the person at the keyboard is the one scanning their own machine.

On top of that the route is same-origin only, allows 8 scans per visitor per 10 minutes and 4 at once per server instance (best effort, like the contact form). Behind Vercel the first `x-forwarded-for` entry is the visitor.

How it was tested: `D:\Projects\Zaka_Promo\_tmp\sitecheck-api.mjs` (`BASE=http://localhost:3100 node sitecheck-api.mjs` against `npm run start -- --port 3100`) fires about 35 attack addresses at the route and checks the answers, plus malformed input, the origin rule, a real scan, the unreachable-site case, the rate limit and simultaneous scans.

## When the package is published

`lib/sitepulseLinks.ts` has two switches. `onGitHub` is **true** (the repository `zaka337/sitepulse` has been public since 2026-11-06): the page links to it and says plainly that the npm package is coming and that for now you run it from a clone. `published` is **true** since 2026-11-06 (`sitepulse@0.1.0` is on npm; the CLI, a scan and the MCP handshake were run from the registry in an empty folder), so the page shows the two copyable commands (`npx sitepulse ...`, `claude mcp add ...`) plus links to GitHub and npm. If the package were ever pulled, set it back to false and the page falls back to the "source on GitHub" wording. Not done yet: the listing in the official MCP registry (`server.json`, needs `mcp-publisher login github`).

Also worth doing then: add sitepulse to `lib/projects.ts` as a project (it is real, tested, and unusual on a portfolio), and link the repository from the resume.

## Limits worth knowing

- It reads the HTML the server sends and does not run JavaScript, so on a site that builds its page in the browser it sees an empty shell.
- Time to first byte is measured once, from the server this site runs on.
- Rate limits are per server instance, not global.
- Not translated: the page is English only (the Urdu pages are `/ur/tldr` and `/ur/hire`).
