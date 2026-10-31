"use client";

import { useEffect } from "react";
import { debugNote } from "@/lib/debugNote";

/* What a visitor sees when a page throws while it runs, instead of the framework's bare "This page couldn't load".
   The links are plain <a> tags on purpose: a full page load works even if the page's own scripts are what broke.
   The 3D head has its own safety net (components/face/SceneGuard.tsx), so this is for everything else. */
export default function ErrorPage({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
    debugNote(`page crashed: ${String(error?.message ?? error).slice(0, 220)}`);
    // do not leave the loading screen over the message
    try { document.getElementById("zk-loader")?.classList.add("zk-done"); } catch { /* nothing to hide */ }
  }, [error]);

  const link = { color: "#0d0d0d", fontWeight: 700, textDecoration: "underline" } as const;
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 9000, overflow: "auto", display: "grid", placeItems: "center", padding: "24px", background: "#f1ede2", color: "#0d0d0d", font: "16px/1.5 Helvetica, Arial, sans-serif" }}>
      <div style={{ maxWidth: 460 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.28em", color: "#ff5a1f" }}>SOMETHING WENT WRONG</p>
        <h1 style={{ margin: "8px 0 12px", fontSize: 34, lineHeight: 1.05, fontWeight: 900, textTransform: "uppercase" }}>This page hit a problem.</h1>
        <p style={{ margin: "0 0 18px" }}>
          Nothing is wrong with your device or your connection. Try again, or open one of the plain pages below, which are the same
          portfolio of Zaka Ullah Waheed, full-stack developer and QA automation engineer.
        </p>
        <p style={{ margin: "0 0 18px" }}>
          <button type="button" onClick={() => (retry ?? reset)?.()} style={{ padding: "12px 22px", border: "3px solid #0d0d0d", borderRadius: 12, background: "#ffd23f", color: "#0d0d0d", font: "800 14px Helvetica, Arial, sans-serif", letterSpacing: "0.08em", cursor: "pointer" }}>
            TRY AGAIN
          </button>
        </p>
        <p style={{ margin: "0 0 18px" }}>
          <a style={link} href="/">Home</a>{"  "}
          <a style={link} href="/tldr">The short version</a>{"  "}
          <a style={link} href="/resume">Resume</a>{"  "}
          <a style={link} href="/contact-me">Contact</a>
        </p>
        <details style={{ fontSize: 13, opacity: 0.8 }}>
          <summary style={{ cursor: "pointer" }}>Technical detail</summary>
          <code style={{ display: "block", marginTop: 6, wordBreak: "break-word" }}>{error.message}{error.digest ? ` (${error.digest})` : ""}</code>
        </details>
      </div>
    </main>
  );
}
