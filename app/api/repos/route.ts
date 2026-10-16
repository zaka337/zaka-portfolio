/* Server-side, cached copy of the GitHub repo list for the /projects/all carousel.
   GitHub allows 60 unauthenticated requests per hour per IP, which a browser-side
   fetch burns through quickly. Here one request an hour (Next's data cache) serves
   every visitor. Optional: GITHUB_TOKEN lifts the limit to 5,000/hour; a token with
   no scopes is enough, it only reads public repos.
   Any failure answers 502 so the page can fall back to its saved list. */

const API = "https://api.github.com/users/zaka337/repos?sort=updated&per_page=100";

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  html_url: string;
}

const failed = () =>
  Response.json({ error: "github_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetch(API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "zaka-portfolio",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Only 200s are stored, so a rate-limited answer is never cached over a good one.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("repos: GitHub answered", res.status);
      return failed();
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return failed();

    const repos = (data as GitHubRepo[])
      .filter((r) => r && r.language !== null)
      .map(({ id, name, description, homepage, language, html_url }) => ({
        id, name, description, homepage, language, html_url,
      }));

    return Response.json(repos, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    console.error("repos: GitHub unreachable");
    return failed();
  }
}
