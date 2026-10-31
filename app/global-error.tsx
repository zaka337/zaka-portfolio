"use client";

/* The last safety net: when even the root layout fails, this replaces the whole document (it must bring its own html and
   body, and it gets none of the site's styles). Same message as app/error.tsx, in plain inline styles. */
export default function GlobalError({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  const link = { color: "#0d0d0d", fontWeight: 700, textDecoration: "underline" } as const;
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f1ede2", color: "#0d0d0d", font: "16px/1.5 Helvetica, Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 460 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.28em", color: "#ff5a1f" }}>SOMETHING WENT WRONG</p>
            <h1 style={{ margin: "8px 0 12px", fontSize: 34, lineHeight: 1.05, fontWeight: 900, textTransform: "uppercase" }}>This site hit a problem.</h1>
            <p style={{ margin: "0 0 18px" }}>Nothing is wrong with your device or your connection. Try again, or reload the page.</p>
            <p style={{ margin: "0 0 18px" }}>
              <button type="button" onClick={() => (retry ?? reset)?.()} style={{ padding: "12px 22px", border: "3px solid #0d0d0d", borderRadius: 12, background: "#ffd23f", color: "#0d0d0d", font: "800 14px Helvetica, Arial, sans-serif", letterSpacing: "0.08em", cursor: "pointer" }}>
                TRY AGAIN
              </button>
            </p>
            <p style={{ margin: "0 0 18px" }}>
              <a style={link} href="/">Home</a>{"  "}
              <a style={link} href="/resume">Resume</a>
            </p>
            <details style={{ fontSize: 13, opacity: 0.8 }}>
              <summary style={{ cursor: "pointer" }}>Technical detail</summary>
              <code style={{ display: "block", marginTop: 6, wordBreak: "break-word" }}>{error.message}{error.digest ? ` (${error.digest})` : ""}</code>
            </details>
          </div>
        </main>
      </body>
    </html>
  );
}
