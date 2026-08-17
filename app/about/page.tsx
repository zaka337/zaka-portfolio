"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

function useScrollUnlock() {
  useEffect(() => {
    const prev = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
    return () => {
      document.documentElement.style.overflowY = prev;
      document.body.style.overflowY = prev;
    };
  }, []);
}

function useTypewriter(phrases: string[], speed = 72, pause = 2200) {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx(i => (i + 1) % phrases.length);
      return;
    }
    const t = setTimeout(() => {
      setText(current.slice(0, charIdx + (deleting ? -1 : 1)));
      setCharIdx(i => i + (deleting ? -1 : 1));
    }, deleting ? speed * 0.5 : speed);
    return () => clearTimeout(t);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return text;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

const ROLES = [
  "Full-Stack Developer.",
  "React & Next.js Engineer.",
  "Flutter App Builder.",
  "QA Automation Engineer.",
  "UI Perfectionist.",
];

const SKILLS: { cat: string; items: string[]; wide?: boolean }[] = [
  { cat: "FRONTEND",          items: ["React.js", "Next.js", "Tailwind CSS", "HTML5", "CSS3", "JavaScript"], wide: true },
  { cat: "FULL-STACK & APIs", items: ["REST APIs", "Firebase", "MongoDB", "SQL"], wide: true },
  { cat: "MOBILE",            items: ["Flutter", "Dart"] },
  { cat: "AUTOMATION & AI",   items: ["n8n Workflows", "AI-Assisted Dev"] },
  { cat: "DEPLOYMENT",        items: ["Vercel", "Netlify", "Git / GitHub", "Docker"] },
  { cat: "QA & TESTING",      items: ["Postman / Newman", "Selenium WebDriver", "Apache JMeter"], wide: true },
];

const TIMELINE = [
  {
    year: "2026",
    title: "3D Portfolio & Spatial UI",
    desc: "Built this immersive 3D portfolio: cursor-tracking avatar, floating carousel, scroll-animated about page. Pushing what browsers can actually do.",
  },
  {
    year: "2025",
    title: "Internships & Production Launches",
    desc: "Frontend Dev Intern at Apexify Technologies. QA Automation Intern at Zong 4G/5G. Independently shipped QA with Zaka (full-stack educational platform) and an n8n-powered website health scanner.",
  },
  {
    year: "2024",
    title: "Mobile & E-Commerce",
    desc: "Built BazaarBox -- a cross-platform e-commerce app in Flutter with Firebase auth and real-time sync. Shipped GlamourHub, a premium e-commerce web app for the Pakistani market.",
  },
  {
    year: "2023",
    title: "APIs, Testing & Workflow Automation",
    desc: "Went deep into REST API integration, QA automation with Selenium and JMeter, and CI-ready Postman/Newman test collections. Learned that reliability matters as much as features.",
  },
  {
    year: "2022",
    title: "Where It All Started",
    desc: "First lines of HTML. First React component. First bug that took hours to fix. Joined Air University for BS Information Technology. Been hooked ever since.",
  },
];

const FACTS = [
  { n: "01", text: "Pixel-perfect or it doesn't ship.",         tag: "OBSESSION"  },
  { n: "02", text: "Best commits land after midnight.",          tag: "HABITS"     },
  { n: "03", text: "Coffee, code, repeat. Non-negotiable.",     tag: "FUEL"       },
  { n: "04", text: "More side projects than finished ones.",     tag: "CONFESSION" },
  { n: "05", text: "1px off? Can't unsee it. Won't ignore it.", tag: "TRUTH"      },
];

const T: React.CSSProperties = { fontFamily: "'Helvetica Neue', Arial, sans-serif" };

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function About() {
  useScrollUnlock();
  const role = useTypewriter(ROLES);

  return (
    <main style={{ backgroundColor: "var(--paper)", minHeight: "100vh", overflowX: "hidden" }}>

      {/* HERO */}
      <section style={{
        position: "relative",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderBottom: "1px solid rgba(13,13,13,0.12)",
      }}>

        {/* NAV ROW */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4vh 4vw",
          flexShrink: 0,
        }}>
          <Link
            href="/"
            style={{
              ...T,
              fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)",
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "var(--ink-50)",
              textDecoration: "none",
              textTransform: "uppercase",
              transition: "color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-50)")}
          >
            {'←'} BACK.
          </Link>
          <span style={{
            ...T,
            fontSize: "clamp(0.65rem, 0.9vw, 0.8rem)",
            fontWeight: 400,
            letterSpacing: "0.12em",
            color: "var(--ink-50)",
            textTransform: "uppercase",
          }}>
            ABOUT ME
          </span>
        </div>

        {/* HERO CONTENT */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 8vw 8vh",
        }}>
          <p style={{
            ...T,
            fontSize: "clamp(0.65rem, 1vw, 0.85rem)",
            fontWeight: 500,
            letterSpacing: "0.2em",
            color: "var(--ink-50)",
            textTransform: "uppercase",
            marginBottom: "1.2rem",
          }}>
            HEY, I&apos;M
          </p>

          <h1 style={{
            ...T,
            fontSize: "clamp(4rem, 13vw, 13rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.85,
            color: "var(--ink)",
            textTransform: "uppercase",
            marginBottom: "2rem",
          }}>
            ZAKA<br />ULLAH<br />WAHEED.
          </h1>

          <div style={{
            ...T,
            fontSize: "clamp(1rem, 2.2vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--ink-70)",
            minHeight: "2.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            {role}
            <span style={{
              display: "inline-block",
              width: 3,
              height: "1.1em",
              backgroundColor: "var(--ink)",
              verticalAlign: "middle",
              animation: "blink 0.9s step-end infinite",
            }} />
          </div>
        </div>

        {/* SCROLL INDICATOR */}
        <div style={{
          position: "absolute",
          bottom: "5vh",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            ...T,
            fontSize: "clamp(0.45rem, 0.6vw, 0.55rem)",
            fontWeight: 500,
            letterSpacing: "0.24em",
            color: "var(--ink-50)",
            textTransform: "uppercase",
          }}>
            SCROLL
          </span>
          <div style={{
            width: 1,
            height: 48,
            backgroundColor: "var(--ink-50)",
            animation: "scrollLine 1.8s ease-in-out infinite",
          }} />
        </div>

      </section>

      {/* BIO */}
      <section style={{
        padding: "12vh 8vw",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6vw",
        alignItems: "start",
        borderBottom: "1px solid rgba(13,13,13,0.12)",
      }}>
        <FadeIn>
          <p style={{
            ...T, fontSize: "clamp(0.5rem, 0.7vw, 0.65rem)", fontWeight: 600,
            letterSpacing: "0.22em", color: "var(--ink-50)",
            textTransform: "uppercase", marginBottom: "1.5rem",
          }}>
            01 {'—'} WHO AM I
          </p>
          <h2 style={{
            ...T, fontSize: "clamp(3rem, 8vw, 8rem)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 0.85,
            color: "var(--ink)", textTransform: "uppercase",
          }}>
            THE<br />STORY.
          </h2>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div style={{ paddingTop: "clamp(0rem, 2vw, 2rem)" }}>
            {[
              "Frontend / Full-Stack Developer based in Islamabad, Pakistan. I design, build, and ship full-stack web platforms end-to-end: React frontends, backend APIs, database integration, and production deployment on Vercel.",
              "I bring a QA mindset to everything I build. From writing Postman/Newman test collections to Selenium WebDriver automation -- reliability isn't an afterthought, it's baked in from the start.",
              "Currently deepening Next.js for production-scale work and experimenting with AI-assisted development and n8n workflow automation. If it improves how software gets built, I'm already tinkering with it.",
            ].map((para, i) => (
              <p key={i} style={{
                ...T, fontSize: "clamp(0.95rem, 1.3vw, 1.2rem)", fontWeight: 400,
                lineHeight: 1.7, color: "var(--ink-70)",
                marginBottom: i < 2 ? "1.4rem" : 0,
              }}>
                {para}
              </p>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* SKILLS */}
      <section style={{
        padding: "12vh 8vw",
        borderBottom: "1px solid rgba(13,13,13,0.12)",
      }}>
        <FadeIn>
          <p style={{
            ...T, fontSize: "clamp(0.5rem, 0.7vw, 0.65rem)", fontWeight: 600,
            letterSpacing: "0.22em", color: "var(--ink-50)",
            textTransform: "uppercase", marginBottom: "0.6rem",
          }}>
            02 {'—'} TOOLKIT
          </p>
          <h2 style={{
            ...T, fontSize: "clamp(2.5rem, 6vw, 6rem)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 0.85,
            color: "var(--ink)", textTransform: "uppercase",
            marginBottom: "4rem",
          }}>
            WHAT I BUILD WITH.
          </h2>
        </FadeIn>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          backgroundColor: "rgba(13,13,13,0.12)",
          border: "1px solid rgba(13,13,13,0.12)",
        }}>
          {SKILLS.map((s, i) => (
            <FadeIn key={i} delay={i * 0.07} style={{ gridColumn: s.wide ? "span 2" : undefined }}>
              <div style={{
                backgroundColor: "var(--paper)",
                padding: "clamp(1.4rem, 2.5vw, 2.2rem)",
                height: "100%",
                boxSizing: "border-box",
              }}>
                <p style={{
                  ...T, fontSize: "clamp(0.45rem, 0.6vw, 0.56rem)", fontWeight: 700,
                  letterSpacing: "0.22em", color: "var(--ink-50)",
                  textTransform: "uppercase", marginBottom: "1rem",
                }}>
                  {s.cat}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {s.items.map(item => (
                    <span key={item} style={{
                      ...T, fontSize: "clamp(0.8rem, 1.1vw, 1rem)", fontWeight: 700,
                      color: "var(--ink)", letterSpacing: "-0.01em",
                    }}>
                      {item}
                      <span style={{ color: "var(--ink-50)", marginLeft: 8 }}>{'·'}</span>
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section style={{
        padding: "12vh 8vw",
        borderBottom: "1px solid rgba(13,13,13,0.12)",
      }}>
        <FadeIn>
          <p style={{
            ...T, fontSize: "clamp(0.5rem, 0.7vw, 0.65rem)", fontWeight: 600,
            letterSpacing: "0.22em", color: "var(--ink-50)",
            textTransform: "uppercase", marginBottom: "0.6rem",
          }}>
            03 {'—'} JOURNEY
          </p>
          <h2 style={{
            ...T, fontSize: "clamp(2.5rem, 6vw, 6rem)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 0.85,
            color: "var(--ink)", textTransform: "uppercase",
            marginBottom: "5rem",
          }}>
            HOW I GOT HERE.
          </h2>
        </FadeIn>

        <div>
          {TIMELINE.map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: "3vw",
                paddingBottom: "3.5rem",
                marginBottom: "3.5rem",
                borderBottom: i < TIMELINE.length - 1 ? "1px solid rgba(13,13,13,0.1)" : "none",
              }}>
                <div>
                  <p style={{
                    ...T, fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 900,
                    color: "rgba(13,13,13,0.08)", letterSpacing: "-0.04em", lineHeight: 1,
                  }}>
                    {item.year}
                  </p>
                </div>
                <div>
                  <p style={{
                    ...T, fontSize: "clamp(0.6rem, 0.8vw, 0.72rem)", fontWeight: 700,
                    letterSpacing: "0.16em", color: "var(--ink-50)",
                    textTransform: "uppercase", marginBottom: "0.6rem",
                  }}>
                    {item.year}
                  </p>
                  <h3 style={{
                    ...T, fontSize: "clamp(1.2rem, 2vw, 1.8rem)", fontWeight: 800,
                    color: "var(--ink)", letterSpacing: "-0.02em",
                    marginBottom: "0.7rem",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    ...T, fontSize: "clamp(0.85rem, 1.1vw, 1rem)", fontWeight: 400,
                    color: "var(--ink-70)", lineHeight: 1.6,
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FUN FACTS */}
      <section style={{
        padding: "12vh 8vw",
        borderBottom: "1px solid rgba(13,13,13,0.12)",
      }}>
        <FadeIn>
          <p style={{
            ...T, fontSize: "clamp(0.5rem, 0.7vw, 0.65rem)", fontWeight: 600,
            letterSpacing: "0.22em", color: "var(--ink-50)",
            textTransform: "uppercase", marginBottom: "0.6rem",
          }}>
            04 {'—'} HUMAN THINGS
          </p>
          <h2 style={{
            ...T, fontSize: "clamp(2.5rem, 6vw, 6rem)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 0.85,
            color: "var(--ink)", textTransform: "uppercase",
            marginBottom: "4rem",
          }}>
            REAL TALK.
          </h2>
        </FadeIn>

        <div style={{ borderTop: "1px solid rgba(13,13,13,0.14)" }}>
          {FACTS.map((f, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(1.2rem, 3vw, 3rem)",
                  borderBottom: "1px solid rgba(13,13,13,0.14)",
                  margin: "0 -8vw",
                  padding: "clamp(1.2rem, 2.2vh, 1.8rem) 8vw",
                  transition: "background 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(13,13,13,0.025)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{
                  ...T, fontSize: "clamp(0.55rem, 0.7vw, 0.65rem)", fontWeight: 700,
                  letterSpacing: "0.16em", color: "var(--ink-50)",
                  flexShrink: 0, minWidth: "2.5rem",
                }}>
                  {f.n}
                </span>
                <p style={{
                  ...T, flex: 1,
                  fontSize: "clamp(1.4rem, 3vw, 3.2rem)",
                  fontWeight: 900, letterSpacing: "-0.03em",
                  color: "var(--ink)", lineHeight: 1.1,
                }}>
                  {f.text}
                </p>
                <span style={{
                  ...T, fontSize: "clamp(0.48rem, 0.62vw, 0.58rem)", fontWeight: 700,
                  letterSpacing: "0.2em", color: "var(--ink-50)",
                  textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {f.tag}
                </span>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "14vh 8vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "2rem",
      }}>
        <FadeIn>
          <p style={{
            ...T, fontSize: "clamp(0.5rem, 0.7vw, 0.65rem)", fontWeight: 600,
            letterSpacing: "0.22em", color: "var(--ink-50)",
            textTransform: "uppercase", marginBottom: "0.8rem",
          }}>
            THAT&apos;S ENOUGH ABOUT ME
          </p>
          <h2 style={{
            ...T, fontSize: "clamp(2.5rem, 7vw, 7rem)", fontWeight: 900,
            letterSpacing: "-0.04em", lineHeight: 0.85,
            color: "var(--ink)", textTransform: "uppercase",
            marginBottom: "3rem",
          }}>
            LET&apos;S TALK<br />ABOUT YOUR<br />PROJECT.
          </h2>

          <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/contact"
              style={{
                ...T, display: "inline-block",
                padding: "1rem 2.4rem",
                border: "1.5px solid var(--ink)",
                borderRadius: 2,
                fontSize: "clamp(0.75rem, 1vw, 0.9rem)", fontWeight: 700,
                letterSpacing: "0.14em", color: "var(--paper)",
                textDecoration: "none", textTransform: "uppercase",
                backgroundColor: "var(--ink)",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--ink)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--ink)"; e.currentTarget.style.color = "var(--paper)"; }}
            >
              SAY HI
            </Link>
            <Link
              href="/projects"
              style={{
                ...T, display: "inline-block",
                padding: "1rem 2.4rem",
                border: "1.5px solid rgba(13,13,13,0.3)",
                borderRadius: 2,
                fontSize: "clamp(0.75rem, 1vw, 0.9rem)", fontWeight: 700,
                letterSpacing: "0.14em", color: "var(--ink-70)",
                textDecoration: "none", textTransform: "uppercase",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(13,13,13,0.3)"; e.currentTarget.style.color = "var(--ink-70)"; }}
            >
              SEE WORK
            </Link>
          </div>
        </FadeIn>
      </section>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes scrollLine {
          0%   { transform: scaleY(0); transform-origin: top;    opacity: 1; }
          50%  { transform: scaleY(1); transform-origin: top;    opacity: 1; }
          100% { transform: scaleY(1); transform-origin: bottom; opacity: 0; }
        }
        @media (max-width: 768px) {
          .about-bio-grid    { grid-template-columns: 1fr !important; }
          .about-skills-grid { grid-template-columns: 1fr !important; }
          .about-timeline    { display: block !important; }
        }
      `}</style>
    </main>
  );
}
