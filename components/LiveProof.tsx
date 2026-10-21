"use client";

import { useRef, useState } from "react";
import { found } from "@/lib/secrets";
import "./liveproof.css";

/* "Don't take my word for it" on a case-study page: a button that checks the project while the
   visitor watches. The numbers come from /api/proof, which really requests the live site and the
   GitHub repository; nothing here is invented, and a failure is shown as a failure. */

interface Site {
  ok: boolean; error?: string; status?: number; redirects?: number; firstByteMs?: number; totalMs?: number;
  https?: boolean; hsts?: boolean; headers?: { passed: number; total: number; missing: string[] };
  encoding?: string | null; title?: string | null; kb?: number; hostedOn?: string | null;
}
interface Repo {
  ok: boolean; error?: string; limited?: boolean; language?: string | null; pushedAt?: string | null;
  defaultBranch?: string | null; sizeKb?: number | null;
  lastCommit?: { message: string; date: string } | null;
  ci?: { name: string; status: string; conclusion: string | null; date: string } | null;
}
interface Proof { checkedAt: string; region: string | null; site: Site | null; repo: Repo | null }

type Mark = "ok" | "bad" | "mid" | "info";
interface Row { mark: Mark; key: string; value: string }

const GLYPH: Record<Mark, string> = { ok: "✓", bad: "✗", mid: "◐", info: "·" };

const ago = (iso?: string | null) => {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  const m = s / 60;
  if (m < 90) return `${Math.round(m)} minutes ago`;
  const h = m / 60;
  if (h < 36) return `${Math.round(h)} hours ago`;
  const d = h / 24;
  if (d < 60) return `${Math.round(d)} days ago`;
  return `${Math.round(d / 30)} months ago`;
};

function siteRows(s: Site): Row[] {
  if (!s.ok && s.error) return [{ mark: "bad", key: "Reachable", value: s.error }];
  const rows: Row[] = [];
  rows.push({
    mark: s.ok ? "ok" : "bad",
    key: "Reachable",
    value: `HTTP ${s.status} · ${s.firstByteMs} ms to first byte · ${s.totalMs} ms in all${s.redirects ? ` · ${s.redirects} redirect${s.redirects > 1 ? "s" : ""}` : ""}`,
  });
  rows.push({ mark: s.https ? "ok" : "bad", key: "Secure connection", value: s.https ? `HTTPS${s.hsts ? " · HSTS on" : " · no HSTS"}` : "plain HTTP" });
  if (s.headers) {
    const { passed, total, missing } = s.headers;
    rows.push({
      mark: passed >= 4 ? "ok" : passed >= 2 ? "mid" : "info",
      key: "Security headers",
      value: `${passed} of ${total}${missing.length ? ` · missing: ${missing.join(", ")}` : ""}`,
    });
  }
  rows.push({ mark: s.encoding ? "ok" : "info", key: "Compressed", value: s.encoding ? s.encoding : "not compressed" });
  if (s.title) rows.push({ mark: "info", key: "Page", value: `“${s.title}” · ${s.kb} KB` });
  if (s.hostedOn) rows.push({ mark: "info", key: "Hosted on", value: s.hostedOn });
  return rows;
}

function repoRows(r: Repo): Row[] {
  if (r.limited) return [{ mark: "info", key: "GitHub", value: "is limiting requests right now, so the code check is skipped. Try again in a few minutes." }];
  if (!r.ok) return [{ mark: "bad", key: "GitHub", value: r.error ?? "could not be checked" }];
  const rows: Row[] = [];
  if (r.pushedAt) rows.push({ mark: "ok", key: "Last push", value: `${ago(r.pushedAt)}${r.defaultBranch ? ` · ${r.defaultBranch}` : ""}` });
  if (r.lastCommit) rows.push({ mark: "info", key: "Last commit", value: `“${r.lastCommit.message}” · ${ago(r.lastCommit.date)}` });
  if (r.ci) {
    const done = r.ci.status === "completed";
    const pass = r.ci.conclusion === "success";
    rows.push({
      mark: !done ? "mid" : pass ? "ok" : "bad",
      key: "Automated tests",
      value: `${!done ? "running" : pass ? "passing" : r.ci.conclusion ?? "finished"} · ${r.ci.name} · ${ago(r.ci.date)}`,
    });
  } else {
    rows.push({ mark: "info", key: "Automated tests", value: "no automated runs on record" });
  }
  if (r.language) rows.push({ mark: "info", key: "Code", value: `${r.language}${r.sizeKb ? ` · ${r.sizeKb >= 1024 ? (r.sizeKb / 1024).toFixed(1) + " MB" : r.sizeKb + " KB"}` : ""}` });
  return rows;
}

export default function LiveProof({ slug, hasSite, hasRepo }: { slug: string; hasSite: boolean; hasRepo: boolean }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [data, setData] = useState<Proof | null>(null);
  const token = useRef(0);

  const run = async () => {
    const mine = ++token.current;
    setState("running");
    try {
      const res = await fetch(`/api/proof?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Proof;
      if (token.current !== mine) return;
      setData(json);
      setState("done");
      found("proof");
    } catch {
      if (token.current === mine) setState("error");
    }
  };

  const what = hasSite && hasRepo ? "the live site and the code" : hasSite ? "the live site" : "the code";
  const groups: { title: string; rows: Row[] }[] = [];
  if (data?.site) groups.push({ title: "The live site", rows: siteRows(data.site) });
  if (data?.repo) groups.push({ title: "The code on GitHub", rows: repoRows(data.repo) });

  let n = 0;
  return (
    <div className="lp">
      <p className="lp-lead">
        Anyone can write &ldquo;it works&rdquo;. This checks {what} for real, right now, from a server, and shows exactly what it finds.
      </p>
      <button type="button" className="cs-btn cs-btn-solid lp-run" onClick={run} disabled={state === "running"}>
        {state === "idle" ? "Check it live" : state === "running" ? "Checking..." : "Check again"}
      </button>

      {state !== "idle" && (
        <div className="lp-box" role="status" aria-live="polite">
          {state === "running" && <div className="lp-wait">Asking {what}...</div>}
          {state === "error" && <div className="lp-wait">The check could not run just now. Try again in a moment.</div>}
          {state === "done" && groups.map((g) => (
            <div className="lp-group" key={g.title}>
              <div className="lp-title">{g.title}</div>
              {g.rows.map((r) => (
                <div className="lp-row" key={r.key} style={{ ["--i" as string]: n++ } as React.CSSProperties}>
                  <span className={`lp-mark is-${r.mark}`} aria-hidden="true">{GLYPH[r.mark]}</span>
                  <span className="lp-key">{r.key}</span>
                  <span className="lp-val">{r.value}</span>
                </div>
              ))}
            </div>
          ))}
          {state === "done" && data && (
            <div className="lp-foot">
              Checked just now{data.region ? ` from a server in ${data.region}` : " from a server"}. Nothing is stored.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
