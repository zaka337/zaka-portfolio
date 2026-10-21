"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KINDS, SIZES, URGENCY, TIMELINE_CHIP, briefText, estimate, featuresFor, weeksLabel, type Kind, type Pick, type Urgency,
} from "@/lib/estimate";
import { saveDraft } from "@/lib/draft";
import { play } from "@/lib/sound";

/* The project estimator. Pick what you need, how big it is and a few extras, and the answer
   builds as you go: a tower of blocks, a range in weeks that counts to its new value, and a
   timeline that redraws itself. Timelines only, never prices, and always a rough guide: Zaka
   confirms after reading the real brief (lib/estimate.ts has the numbers). */

/* A number that glides to its new value instead of jumping */
function useTween(target: number, ms = 650): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const cur = useRef(target);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { cur.current = target; setV(target); return; }
    from.current = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      cur.current = from.current + (target - from.current) * e;
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const SHORT: Record<string, string> = {
  auth: "Login", pay: "Payments", admin: "Admin", ai: "AI", motion: "3D / motion", cms: "CMS", api: "Services",
  tests: "Tests", ci: "CI runs", report: "Reports", i18n: "Languages", seo: "SEO",
};

const WINDOW_LABEL = { fits: "Fits your time", tight: "Tight", over: "Longer than your window", open: "No deadline" } as const;

export default function Estimator() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("Web app");
  const [size, setSize] = useState(2);
  const [features, setFeatures] = useState<string[]>(["auth"]);
  const [design, setDesign] = useState<"have" | "need">("need");
  const [urgency, setUrgency] = useState<Urgency>("Within 1 to 3 months");
  const [copied, setCopied] = useState(false);

  const pick: Pick = { kind, size, features, design, urgency };
  const est = useMemo(() => estimate(pick), [kind, size, features, design, urgency]); // eslint-disable-line react-hooks/exhaustive-deps
  const avail = featuresFor(kind);

  const chooseKind = (k: Kind) => {
    setKind(k);
    // Keep only the extras that make sense for what was chosen
    const ok = new Set(featuresFor(k).map((f) => f.id));
    setFeatures((cur) => cur.filter((id) => ok.has(id)));
    play("tick");
  };
  const toggle = (id: string) => { setFeatures((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])); play("key"); };

  const minT = useTween(est.min);
  const maxT = useTween(est.max);
  const loadT = useTween(est.load, 800);

  // The tower: the base build, then one block per extra, then design help
  const blocks = [
    { id: "base", label: `${kind}`, h: 30 + size * 12, tone: "base" },
    ...features.map((id) => ({ id, label: SHORT[id] ?? id, h: 24, tone: "feat" })),
    ...(design === "need" ? [{ id: "design", label: "Design", h: 24, tone: "design" }] : []),
  ];
  const widthFor = (tone: string, i: number) => (tone === "base" ? 100 : tone === "design" ? 72 : 58 + ((i * 13) % 28));

  const total = est.phases.reduce((s, p) => s + p.weeks, 0) || 1;
  const maxPart = Math.max(...est.parts.map((p) => p.weeks), 1);

  const sendBrief = () => {
    saveDraft({ from: "project estimate", message: briefText(pick, est), needs: [kind], timeline: TIMELINE_CHIP[urgency] });
    router.push("/contact-me");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(briefText(pick, est)); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { /* clipboard refused */ }
  };

  return (
    <section className="es" aria-labelledby="es-title">
      <div className="es-intro">
        <p className="hr-label">PROJECT ESTIMATE</p>
        <h2 id="es-title" className="hr-h2">How long would your project take?</h2>
        <p className="hr-lead">
          Pick what you need and watch the estimate build. It is a rough guide from typical projects, in weeks, not a quote:
          I confirm after reading your real brief.
        </p>
      </div>

      <div className="es-grid">
        <div className="es-controls">
          <fieldset className="es-step">
            <legend className="hr-micro"><b>1</b> WHAT DO YOU NEED?</legend>
            <div className="es-kinds">
              {KINDS.map((k) => (
                <button key={k} type="button" className="es-kind" aria-pressed={kind === k} onClick={() => chooseKind(k)}>{k}</button>
              ))}
            </div>
          </fieldset>

          <fieldset className="es-step">
            <legend className="hr-micro"><b>2</b> HOW BIG IS IT?</legend>
            <div className="es-size">
              <input
                type="range" min={0} max={4} step={1} value={size}
                aria-label="How big is it" aria-valuetext={SIZES[size]}
                onChange={(e) => { setSize(Number(e.target.value)); play("key"); }}
              />
              <div className="es-ticks" aria-hidden="true">
                {SIZES.map((s, i) => <span key={s} className={i === size ? "is-on" : ""}>{s}</span>)}
              </div>
            </div>
          </fieldset>

          <fieldset className="es-step">
            <legend className="hr-micro"><b>3</b> ANY EXTRAS?</legend>
            <div className="es-feats">
              {avail.map((f) => (
                <button key={f.id} type="button" className="hr-chip" aria-pressed={features.includes(f.id)} onClick={() => toggle(f.id)}>{f.label}</button>
              ))}
            </div>
            <div className="es-two" role="group" aria-label="Design">
              <button type="button" className="hr-chip" aria-pressed={design === "have"} onClick={() => setDesign("have")}>I have designs</button>
              <button type="button" className="hr-chip" aria-pressed={design === "need"} onClick={() => setDesign("need")}>I need design help</button>
            </div>
          </fieldset>

          <fieldset className="es-step">
            <legend className="hr-micro"><b>4</b> HOW SOON?</legend>
            <div className="es-feats">
              {URGENCY.map((u) => (
                <button key={u} type="button" className="hr-chip" aria-pressed={urgency === u} onClick={() => setUrgency(u)}>{u}</button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="es-out" aria-live="polite">
          <div className="es-card">
            <p className="hr-micro">ROUGH ESTIMATE</p>
            <p className="es-weeks">
              <span className="es-num">{minT.toFixed(est.min % 1 ? 1 : 0)}</span>
              <span className="es-to"> to </span>
              <span className="es-num">{maxT.toFixed(est.max % 1 ? 1 : 0)}</span>
              <span className="es-unit"> weeks</span>
            </p>
            <p className="hr-srt">{`About ${weeksLabel(est)} weeks. ${est.loadLabel}. ${WINDOW_LABEL[est.window]}.`}</p>

            <div className="es-gauge" aria-hidden="true">
              <div className="es-gauge-fill" style={{ transform: `scaleX(${loadT})` }} />
              <span className="es-gauge-l">{est.loadLabel}</span>
            </div>

            <div className="es-tower" aria-hidden="true">
              <div className="es-stack">
                {blocks.map((b, i) => ({ b, i })).reverse().map(({ b, i }) => (
                  <div key={b.id} className={`es-block is-${b.tone}`} style={{ height: b.h, width: `${widthFor(b.tone, i)}%` }}>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="es-ground" />
            </div>

            <span className={`es-window is-${est.window}`}>{WINDOW_LABEL[est.window]}</span>
            <p className="hr-note">{est.windowNote}</p>
          </div>

          <div className="es-card">
            <p className="hr-micro">THE TIMELINE (A TYPICAL SPLIT)</p>
            <div className="es-gantt" aria-hidden="true">
              {est.phases.map((p, i) => (
                <div key={p.id} className="es-row">
                  <span className="es-row-l">{p.label}</span>
                  <div className="es-track">
                    <i className="es-seg" style={{ left: `${(p.start / total) * 100}%`, width: `${(p.weeks / total) * 100}%`, ["--i" as string]: i } as React.CSSProperties} />
                  </div>
                </div>
              ))}
              <div className="es-scale"><span>Week 0</span><span>about {weeksLabel(est)}</span></div>
            </div>
            <ul className="hr-srt">{est.phases.map((p) => <li key={p.id}>{p.label}</li>)}</ul>
          </div>

          <div className="es-card">
            <p className="hr-micro">WHERE THE WEEKS GO</p>
            <ul className="es-parts">
              {est.parts.map((p, i) => (
                <li key={p.label}>
                  <span>{p.label}</span>
                  <i style={{ width: `${Math.max(6, (p.weeks / maxPart) * 100)}%`, ["--i" as string]: i } as React.CSSProperties} />
                </li>
              ))}
            </ul>
          </div>

          <div className="es-actions">
            <button type="button" className="hr-btn is-main" onClick={sendBrief}><span>Use this as my brief</span><span aria-hidden="true">{'→'}</span></button>
            <button type="button" className="hr-btn" onClick={copy}>{copied ? "Copied" : "Copy the brief"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
