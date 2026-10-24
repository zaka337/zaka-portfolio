import { ImageResponse } from "next/og";

/* The icon an iPhone or iPad uses when the site is added to the Home Screen (iOS rounds the corners
   itself, so the picture is a full square). Same "Z." mark as the other icons. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: "#0d0d0d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", fontFamily: "sans-serif", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.06em", marginTop: -8 }}>
        <span style={{ color: "#f1ede2", fontSize: 100 }}>Z</span>
        <span style={{ color: "#ffd23f", fontSize: 100, marginLeft: 2 }}>.</span>
      </div>
    </div>,
    { ...size }
  );
}
