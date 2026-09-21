import { ImageResponse } from "next/og";

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
      <span
        style={{
          color: "#f1ede2",
          fontSize: 340,
          fontWeight: 900,
          fontFamily: "sans-serif",
          lineHeight: 1,
          letterSpacing: "-0.05em",
          marginTop: 20,
        }}
      >
        Z
      </span>
    </div>,
    { ...size }
  );
}
