"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Repo {
  id: number;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  html_url: string;
}

const META: Record<string, { title: string; desc: string }> = {
  "QA_with_ZAKA":           { title: "QA WITH ZAKA",    desc: "AI-powered Q&A platform" },
  "Zong-health-scanner":    { title: "ZONG SCANNER",    desc: "Telecom health diagnostics" },
  "momcare-ai-backend":     { title: "MOMCARE AI",      desc: "Maternal care AI backend" },
  "ECOMMERCE-PLATFORM":     { title: "ECOMMERCE",       desc: "Mobile e-commerce app" },
  "my-store":               { title: "MY STORE",        desc: "Storefront with checkout" },
  "Instagram_Clone":        { title: "IG CLONE",        desc: "Feed & stories clone" },
  "ecommerce-fullstack-design.": { title: "EC FULLSTACK", desc: "Full-stack e-commerce design" },
  "my-portfolio":           { title: "OLD PORTFOLIO",   desc: "Previous portfolio site" },
  "Metro-Mart":             { title: "METRO MART",      desc: "E-commerce Web Lab project" },
  "My-Calculator":          { title: "CALCULATOR",      desc: "Minimal calculator app" },
  "DockerTesting":          { title: "DOCKER",          desc: "Containerized web app" },
  "devOps-t5":              { title: "DEVOPS T5",       desc: "DevOps pipeline project" },
  "testAWS":                { title: "AWS DEPLOY",      desc: "TypeScript on AWS" },
  "aws-elastic-beanstalk-express-js-sample": { title: "BEANSTALK", desc: "Express.js on AWS" },
};

const LIVE_URLS: Record<string, string> = {
  "QA_with_ZAKA":  "https://qa-with-zaka-4pc9.vercel.app/",
  "GlamourHub":    "https://glamourhubpk.netlify.app/",
  "glamourhub":    "https://glamourhubpk.netlify.app/",
  "MG-Outlet":     "https://glamourhubpk.netlify.app/",
  "mg-outlet":     "https://glamourhubpk.netlify.app/",
  "my-portfolio":  "https://zakasportfolio.netlify.app/",
  "Zaka-Portfolio":"https://zakasportfolio.netlify.app/",
  "zaka-portfolio":"https://zakasportfolio.netlify.app/",
  "portfolio":     "https://zakasportfolio.netlify.app/",
};

const SKIP_HOMEPAGE = new Set([
  "aws-elastic-beanstalk-express-js-sample",
]);

const COLORS = [
  { bg: "#d4c9b0", ink: "#0d0d0d" },
  { bg: "#c9d4b0", ink: "#1a3a1a" },
  { bg: "#b0c9d4", ink: "#0d2a3a" },
  { bg: "#d4b0c9", ink: "#3a0d2a" },
  { bg: "#d4d0b0", ink: "#3a360d" },
  { bg: "#c4b0d4", ink: "#280d3a" },
  { bg: "#b0d4c4", ink: "#0d3a28" },
  { bg: "#d4bab0", ink: "#3a1a0d" },
  { bg: "#b0b4d4", ink: "#0d1040" },
  { bg: "#d4c4b0", ink: "#3a2a0d" },
  { bg: "#b4d4b0", ink: "#103a10" },
  { bg: "#d4b0b0", ink: "#3a0d0d" },
];

const AUTO_SPEED = 0.0018;

function cardSpatial(i: number) {
  const a = i * 2.39996;
  const b = i * 1.61803;
  const c = i * 1.32472;
  return {
    yOff:  Math.sin(a) * 110,
    zAdd:  Math.cos(b) * 55,
    tiltX: Math.sin(c) * 16,
    tiltZ: Math.cos(a * 0.7) * 11,
  };
}

function getLiveUrl(repo: Repo): string | null {
  return LIVE_URLS[repo.name]
    ?? (SKIP_HOMEPAGE.has(repo.name) ? null
       : repo.homepage?.startsWith("http") ? repo.homepage : null);
}

export default function Projects() {
  const [repos, setRepos]     = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vp, setVp]           = useState({ w: 1280, h: 800 });
  const ringRef  = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const rotRef   = useRef(0);
  const rafRef   = useRef<number>(0);
  const ctrlRef  = useRef({ auto: true, dragging: false, startX: 0, startRot: 0 });

  /* ── Viewport tracking (debounced) ───────────────────────────────── */
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    let t: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(t); t = setTimeout(update, 150); };
    window.addEventListener("resize", debounced);
    return () => { window.removeEventListener("resize", debounced); clearTimeout(t); };
  }, []);

  /* ── Responsive carousel dimensions ─────────────────────────────── */
  const isMobile    = vp.w < 640;
  const BASE_RADIUS = Math.max(220, Math.min(vp.w * 0.38, 650));
  const CARD_W      = Math.round(Math.max(130, Math.min(BASE_RADIUS * 0.36, 200)));
  const CARD_H      = Math.round(CARD_W * 0.78);
  const PERSPECTIVE = Math.round(BASE_RADIUS * 4.8);
  // Scale the whole 3D scene on narrow screens so depth is preserved without overflow
  const carouselScale = isMobile ? Math.min(1, vp.w / 440) : 1;

  /* ── GitHub fetch ──────────────────────────────────────────────── */
  useEffect(() => {
    fetch("https://api.github.com/users/zaka337/repos?sort=updated&per_page=100")
      .then(r => r.json())
      .then((data: Repo[]) => {
        const filtered = data.filter((r: Repo) => r.language !== null);
        filtered.sort((a, b) => {
          const aLive = !!getLiveUrl(a);
          const bLive = !!getLiveUrl(b);
          return (bLive ? 1 : 0) - (aLive ? 1 : 0);
        });
        setRepos(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ── 3D animation loop (all viewports) ────────────────────────── */
  useEffect(() => {
    if (!repos.length || !ringRef.current) return;
    const ring = ringRef.current;
    const n    = repos.length;
    const ctrl = ctrlRef.current;
    let autoTimer: ReturnType<typeof setTimeout>;

    // Cache card elements once — avoids a live DOM query every rAF tick
    requestAnimationFrame(() => {
      cardsRef.current = Array.from(ring.querySelectorAll<HTMLElement>("[data-ci]"));
    });

    const tick = () => {
      if (ctrl.auto && !ctrl.dragging) rotRef.current += AUTO_SPEED;
      const deg = (rotRef.current * 180) / Math.PI;
      ring.style.transform = `rotateX(-10deg) rotateY(${deg}deg)`;

      cardsRef.current.forEach(card => {
        const i    = parseInt(card.getAttribute("data-ci")!);
        const eff  = (i / n) * Math.PI * 2 + rotRef.current;
        const cosA = Math.cos(eff);

        if (cosA < -0.08) {
          card.style.opacity       = "0";
          card.style.pointerEvents = "none";
          return;
        }
        const t = Math.max(0, cosA);
        const blur = (1 - t) * 14;
        card.style.filter  = blur > 0.6
          ? `blur(${blur.toFixed(1)}px)`
          : `drop-shadow(0 14px 40px rgba(0,0,0,0.22))`;
        card.style.opacity       = (0.18 + t * 0.82).toFixed(3);
        card.style.zIndex        = String(Math.round(t * 100));
        card.style.pointerEvents = t > 0.58 ? "auto" : "none";
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onDown = (e: MouseEvent) => {
      clearTimeout(autoTimer);
      ctrl.auto = false; ctrl.dragging = true;
      ctrl.startX = e.clientX; ctrl.startRot = rotRef.current;
    };
    const onMove = (e: MouseEvent) => {
      if (!ctrl.dragging) return;
      rotRef.current = ctrl.startRot - (e.clientX - ctrl.startX) * 0.005;
    };
    const onUp = () => {
      ctrl.dragging = false;
      autoTimer = setTimeout(() => { ctrl.auto = true; }, 1800);
    };
    const onTouchStart = (e: TouchEvent) => {
      clearTimeout(autoTimer);
      ctrl.auto = false; ctrl.dragging = true;
      ctrl.startX = e.touches[0].clientX; ctrl.startRot = rotRef.current;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!ctrl.dragging) return;
      rotRef.current = ctrl.startRot - (e.touches[0].clientX - ctrl.startX) * 0.005;
    };
    const onTouchEnd = () => {
      ctrl.dragging = false;
      autoTimer = setTimeout(() => { ctrl.auto = true; }, 1800);
    };

    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mousemove",  onMove, { passive: true });
    window.addEventListener("mouseup",    onUp);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: true });
    window.addEventListener("touchend",   onTouchEnd);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(autoTimer);
      window.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onTouchEnd);
    };
  }, [repos]);

  const stepCarousel = (dir: number) => {
    if (!repos.length) return;
    rotRef.current -= dir * ((Math.PI * 2) / repos.length);
    ctrlRef.current.auto = false;
    setTimeout(() => { ctrlRef.current.auto = true; }, 2500);
  };

  const n = repos.length;

  const arrowBase: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    zIndex: 200,
    width: "clamp(36px, 5vw, 48px)",
    height: "clamp(36px, 5vw, 48px)",
    border: "1.5px solid rgba(13,13,13,0.22)", borderRadius: "50%",
    background: "transparent", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "rgba(13,13,13,0.28)",
    fontSize: "clamp(18px, 3vw, 28px)",
    lineHeight: "1",
    transition: "border-color 0.2s, color 0.2s",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    touchAction: "manipulation",
  };

  return (
    <main style={{
      width: "100vw",
      height: "100dvh",
      overflow: "hidden",
      backgroundColor: "var(--paper)", position: "relative",
      userSelect: "none",
    }}>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.65); }
        }
      `}</style>

      {/* ── Back ──────────────────────────────────────────────── */}
      <Link href="/" style={{
        position: "absolute", top: "clamp(16px, 4vh, 40px)", left: "clamp(16px, 4vw, 40px)",
        zIndex: 200,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)", fontWeight: 600,
        letterSpacing: "0.12em", color: "var(--ink-50)",
        textDecoration: "none", textTransform: "uppercase",
        transition: "color 0.2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-50)")}>
        {'←'} BACK.
      </Link>

      {/* ── Center label ──────────────────────────────────────── */}
      <span style={{
        position: "absolute", top: "clamp(16px, 4vh, 40px)", left: "50%",
        transform: "translateX(-50%)", zIndex: 200,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)", fontWeight: 500,
        letterSpacing: "0.12em", color: "var(--ink-50)",
        textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        my_projects — github/zaka337
      </span>

      {/* ── Repo count ────────────────────────────────────────── */}
      {!loading && n > 0 && (
        <span style={{
          position: "absolute", top: "clamp(16px, 4vh, 40px)", right: "clamp(16px, 4vw, 40px)",
          zIndex: 200,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)", fontWeight: 400,
          letterSpacing: "0.12em", color: "var(--ink-50)",
          textTransform: "uppercase",
        }}>
          {n} repos
        </span>
      )}

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <p style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", zIndex: 200,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "clamp(0.7rem, 1vw, 0.85rem)", fontWeight: 500,
          letterSpacing: "0.14em", color: "var(--ink-50)",
          textTransform: "uppercase",
        }}>
          FETCHING REPOS...
        </p>
      )}

      {/* ── Hint (swipe on mobile, drag on desktop) ───────────── */}
      {!loading && n > 0 && (
        <span style={{
          position: "absolute", bottom: "4vh", left: "50%",
          transform: "translateX(-50%)", zIndex: 200,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "clamp(0.5rem, 0.65vw, 0.6rem)", fontWeight: 400,
          letterSpacing: "0.26em", color: "var(--ink-50)",
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          {isMobile ? "SWIPE TO EXPLORE" : "DRAG TO EXPLORE"}
        </span>
      )}

      {/* ── Arrows (desktop only) ─────────────────────────────── */}
      {!isMobile && !loading && (
        <>
          <button
            onClick={() => stepCarousel(-1)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(13,13,13,0.22)"; e.currentTarget.style.color = "rgba(13,13,13,0.28)"; }}
            style={{ ...arrowBase, left: "clamp(8px, 3vw, 40px)" }}>
            &#8249;
          </button>
          <button
            onClick={() => stepCarousel(1)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(13,13,13,0.22)"; e.currentTarget.style.color = "rgba(13,13,13,0.28)"; }}
            style={{ ...arrowBase, right: "clamp(8px, 3vw, 40px)" }}>
            &#8250;
          </button>
        </>
      )}

      {/* ── 3D Scene (mobile gets CSS scale to preserve depth) ── */}
      {!loading && n > 0 && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {/* Scale wrapper — shrinks scene on narrow viewports without losing 3D depth */}
          <div style={{
            position: "absolute", inset: 0,
            ...(isMobile ? {
              transform: `scale(${carouselScale})`,
              transformOrigin: "50% 42%",
            } : {}),
          }}>
            <div style={{
              position: "absolute", inset: 0,
              perspective: `${PERSPECTIVE}px`,
              perspectiveOrigin: "50% 38%",
              cursor: isMobile ? "default" : "grab",
            }}>
              <div style={{
                position: "absolute",
                left: "50%", top: "50%",
                width: 0, height: 0,
                transform: "translate3d(0, 0, -240px)",
                transformStyle: "preserve-3d",
              }}>
                <div ref={ringRef} style={{
                  width: 0, height: 0,
                  transformStyle: "preserve-3d",
                  transform: "rotateX(-10deg) rotateY(0deg)",
                }}>
                  {repos.map((repo, i) => {
                    const angleDeg = (i / n) * 360;
                    const sp   = cardSpatial(i);
                    const live = getLiveUrl(repo);
                    const col  = COLORS[i % COLORS.length];
                    const ink  = live ? "#0d0d0d" : col.ink;
                    const meta  = META[repo.name];
                    const title = meta?.title ?? repo.name.replace(/[-_]/g, " ").toUpperCase();
                    const desc  = meta?.desc  ?? repo.description ?? "Project";

                    const cardTransform = [
                      `rotateY(${angleDeg}deg)`,
                      `translateZ(${BASE_RADIUS + sp.zAdd}px)`,
                      `translateY(${sp.yOff}px)`,
                      `rotateX(${sp.tiltX}deg)`,
                      `rotateZ(${sp.tiltZ}deg)`,
                    ].join(" ");

                    return (
                      <a
                        key={repo.id}
                        data-ci={String(i)}
                        href={live ?? repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: "absolute",
                          width: CARD_W, height: CARD_H,
                          left: -CARD_W / 2, top: -CARD_H / 2,
                          transform: cardTransform,
                          backgroundColor: live ? "#fff" : col.bg,
                          border: live
                            ? "1px solid rgba(26,140,60,0.22)"
                            : "1px solid rgba(0,0,0,0.1)",
                          ...(live ? { borderLeft: "4px solid #1a8c3c" } : {}),
                          borderRadius: 6,
                          padding: live
                            ? `${Math.round(CARD_H * 0.09)}px ${Math.round(CARD_W * 0.08)}px ${Math.round(CARD_H * 0.09)}px ${Math.round(CARD_W * 0.07)}px`
                            : `${Math.round(CARD_H * 0.09)}px ${Math.round(CARD_W * 0.08)}px`,
                          textDecoration: "none",
                          backfaceVisibility: "hidden",
                          display: "flex", flexDirection: "column",
                          justifyContent: "space-between",
                          overflow: "hidden",
                          fontFamily: "'Helvetica Neue', Arial, sans-serif",
                          boxSizing: "border-box",
                          willChange: "filter, opacity",
                        }}
                      >
                        {/* Language + badge row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          {repo.language && (
                            <span style={{
                              fontSize: Math.max(7, CARD_W * 0.047), fontWeight: 700, letterSpacing: "0.12em",
                              color: ink, opacity: 0.55, textTransform: "uppercase",
                              background: "rgba(0,0,0,0.08)", padding: "2px 6px", borderRadius: 2,
                            }}>
                              {repo.language}
                            </span>
                          )}
                          {live ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 3,
                              fontSize: Math.max(7, CARD_W * 0.05), fontWeight: 800, letterSpacing: "0.12em",
                              color: "#fff", background: "#1a8c3c",
                              padding: "3px 7px", borderRadius: 3, textTransform: "uppercase",
                            }}>
                              <span style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: "#7eff9e", flexShrink: 0,
                                animation: "livePulse 1.4s ease-in-out infinite",
                              }} />
                              LIVE
                            </span>
                          ) : (
                            <span style={{
                              fontSize: Math.max(6, CARD_W * 0.043), fontWeight: 600, letterSpacing: "0.1em",
                              color: ink, background: "rgba(0,0,0,0.08)",
                              padding: "2px 6px", borderRadius: 2, textTransform: "uppercase",
                              opacity: 0.45,
                            }}>
                              {'GITHUB ↗'}
                            </span>
                          )}
                        </div>

                        {/* Watermark */}
                        <span style={{
                          position: "absolute", bottom: -6, right: 8,
                          fontSize: Math.round(CARD_W * 0.3), fontWeight: 900, color: ink,
                          opacity: 0.06, userSelect: "none", lineHeight: 1,
                        }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        {/* Title + desc */}
                        <div>
                          <p style={{
                            fontSize: Math.max(9, CARD_W * 0.068), fontWeight: 800, color: ink,
                            textTransform: "uppercase", letterSpacing: "-0.01em",
                            lineHeight: 1.1, margin: "0 0 4px",
                          }}>
                            {title}
                          </p>
                          <p style={{
                            fontSize: Math.max(8, CARD_W * 0.054), fontWeight: 400, color: ink,
                            opacity: 0.65, lineHeight: 1.4, margin: 0,
                          }}>
                            {desc}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
