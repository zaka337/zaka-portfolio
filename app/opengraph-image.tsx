import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Zaka Ullah Waheed — Full-Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f1ede2",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 8,
            height: "100%",
            background: "#0d0d0d",
          }}
        />

        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: "rgba(13,13,13,0.45)",
              textTransform: "uppercase",
            }}
          >
            PORTFOLIO · 2025
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "0.18em",
              color: "rgba(13,13,13,0.35)",
              textTransform: "uppercase",
            }}
          >
            BASED IN PAKISTAN · OPEN TO REMOTE
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <span
            style={{
              fontSize: 148,
              fontWeight: 900,
              color: "#0d0d0d",
              lineHeight: 0.82,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
            }}
          >
            ZAKA.
          </span>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "rgba(13,13,13,0.5)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 24,
            }}
          >
            FULL-STACK DEVELOPER
          </span>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "0.14em",
              color: "rgba(13,13,13,0.35)",
              textTransform: "uppercase",
            }}
          >
            REACT · NEXT.JS · FLUTTER · QA AUTOMATION · TYPESCRIPT
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "rgba(13,13,13,0.45)",
              textTransform: "uppercase",
            }}
          >
            zakas2379@gmail.com
          </span>
        </div>
      </div>
    ),
    size
  );
}
