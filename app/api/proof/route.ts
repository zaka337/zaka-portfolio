import { PROJECTS } from "@/lib/projects";

/* "Don't take my word for it": a case-study page can check its own project while the visitor
   watches (components/LiveProof.tsx). This is the server half. It looks at the live site and at
   the GitHub repository and reports what it really finds: nothing here is stored or made up.

   Safety: the only addresses it ever fetches are the ones already in lib/projects.ts (and GitHub's
   public API for the repository named there). The visitor sends a project name, never an address.
   Redirects are followed by hand and must stay on public https hosts, so a redirect cannot be used
   to make this server look at anything private. */

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const UA = "zaka-portfolio-proof/1.0 (+https://zaka-portfolio-two.vercel.app)";

const HEADER_CHECKS: { key: string; label: string; has: (h: Headers) => boolean }[] = [
  { key: "hsts", label: "HSTS", has: (h) => h.has("strict-transport-security") },
  { key: "csp", label: "content security policy", has: (h) => h.has("content-security-policy") },
  { key: "nosniff", label: "no-sniff", has: (h) => (h.get("x-content-type-options") ?? "").toLowerCase().includes("nosniff") },
  { key: "frame", label: "clickjacking protection", has: (h) => h.has("x-frame-options") || /frame-ancestors/i.test(h.get("content-security-policy") ?? "") },
  { key: "referrer", label: "referrer policy", has: (h) => h.has("referrer-policy") },
  { key: "permissions", label: "permissions policy", has: (h) => h.has("permissions-policy") },
];

function assertPublicHttps(url: URL) {
  const h = url.hostname.toLowerCase();
  if (url.protocol !== "https:") throw new Error("not https");
  if (h === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":") || h.endsWith(".local") || h.endsWith(".internal")) {
    throw new Error("not a public host");
  }
}

async function readUpTo(res: Response, max: number) {
  const reader = res.body?.getReader();
  if (!reader) return { text: "", bytes: 0, capped: false };
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  let capped = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (text.length < max) text += decoder.decode(value, { stream: true });
    if (bytes >= max) { capped = true; break; }
  }
  try { await reader.cancel(); } catch { /* finished */ }
  return { text, bytes, capped };
}

async function checkSite(start: string) {
  try {
    let url = new URL(start);
    const t0 = performance.now();
    let res: Response | null = null;
    let redirects = 0;
    for (let hop = 0; hop < 5; hop++) {
      assertPublicHttps(url);
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(9000),
        headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
        cache: "no-store",
      });
      const to = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && to) { url = new URL(to, url); redirects++; continue; }
      break;
    }
    if (!res) return { ok: false, error: "no answer" };
    const firstByteMs = Math.round(performance.now() - t0);
    const body = await readUpTo(res, 400_000);
    const totalMs = Math.round(performance.now() - t0);
    const h = res.headers;
    const checks = HEADER_CHECKS.map((c) => ({ key: c.key, label: c.label, ok: c.has(h) }));
    const declared = Number(h.get("content-length"));
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: url.toString(),
      redirects,
      firstByteMs,
      totalMs,
      https: url.protocol === "https:",
      hsts: h.has("strict-transport-security"),
      headers: { passed: checks.filter((c) => c.ok).length, total: checks.length, missing: checks.filter((c) => !c.ok).map((c) => c.label) },
      encoding: h.get("content-encoding") ?? null,
      title: /<title[^>]*>([^<]{1,140})<\/title>/i.exec(body.text)?.[1]?.replace(/\s+/g, " ").trim() ?? null,
      kb: Math.max(1, Math.round((Number.isFinite(declared) && declared > 0 ? declared : body.bytes) / 1024)),
      hostedOn: h.has("x-vercel-id") ? "Vercel" : h.has("x-nf-request-id") ? "Netlify" : h.has("cf-ray") ? "Cloudflare" : null,
    };
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { ok: false, error: timedOut ? "no answer within 9 seconds" : "could not connect" };
  }
}

async function gh(path: string) {
  const token = process.env.GITHUB_TOKEN;
  return fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "zaka-portfolio", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    next: { revalidate: 600 }, // GitHub limits unauthenticated calls: one real lookup every ten minutes serves everyone
    signal: AbortSignal.timeout(7000),
  });
}

async function checkRepo(repoUrl: string) {
  const m = /github\.com\/([\w.-]+)\/([\w.-]+)/.exec(repoUrl);
  if (!m) return { ok: false, error: "no repository" };
  const [, owner, name] = m;
  try {
    const res = await gh(`/repos/${owner}/${name}`);
    if (res.status === 403 || res.status === 429) return { ok: false, limited: true };
    if (!res.ok) return { ok: false, error: "repository not found" };
    const repo = (await res.json()) as { language?: string | null; pushed_at?: string; default_branch?: string; size?: number; html_url?: string };

    const [commitRes, runRes] = await Promise.all([
      gh(`/repos/${owner}/${name}/commits?per_page=1`).catch(() => null),
      gh(`/repos/${owner}/${name}/actions/runs?per_page=1`).catch(() => null),
    ]);
    let lastCommit: { message: string; date: string } | null = null;
    if (commitRes?.ok) {
      const c = (await commitRes.json()) as { commit?: { message?: string; author?: { date?: string } } }[];
      const first = c?.[0]?.commit;
      if (first?.message) lastCommit = { message: first.message.split("\n")[0].slice(0, 90), date: first.author?.date ?? repo.pushed_at ?? "" };
    }
    let ci: { name: string; status: string; conclusion: string | null; date: string } | null = null;
    if (runRes?.ok) {
      const r = (await runRes.json()) as { workflow_runs?: { name?: string; status?: string; conclusion?: string | null; updated_at?: string }[] };
      const run = r.workflow_runs?.[0];
      if (run) ci = { name: run.name ?? "workflow", status: run.status ?? "", conclusion: run.conclusion ?? null, date: run.updated_at ?? "" };
    }
    return {
      ok: true,
      language: repo.language ?? null,
      pushedAt: repo.pushed_at ?? null,
      defaultBranch: repo.default_branch ?? null,
      sizeKb: repo.size ?? null,
      lastCommit,
      ci,
    };
  } catch {
    return { ok: false, error: "GitHub did not answer" };
  }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project || (!project.live && !project.repo)) {
    return Response.json({ error: "unknown project" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const [site, repo] = await Promise.all([
    project.live ? checkSite(project.live) : Promise.resolve(null),
    project.repo ? checkRepo(project.repo) : Promise.resolve(null),
  ]);
  return Response.json(
    { slug, checkedAt: new Date().toISOString(), region: process.env.VERCEL_REGION ?? null, site, repo },
    { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=60" } },
  );
}
