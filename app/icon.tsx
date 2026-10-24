import { ImageResponse } from "next/og";

/* The favicon: the "Z." mark (a Z and the yellow full stop of ZAKA.), the same as the installed app icon. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 512,
        height: 512,
        background: "#0d0d0d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", fontFamily: "sans-serif", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.06em", marginTop: -20 }}>
        <span style={{ color: "#f1ede2", fontSize: 320 }}>Z</span>
        <span style={{ color: "#ffd23f", fontSize: 320, marginLeft: 6 }}>.</span>
      </div>
    </div>,
    { ...size }
  );
}
