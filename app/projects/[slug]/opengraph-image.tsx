import { ImageResponse } from "next/og";
import { PROJECTS, PROJECT_META, getProject } from "@/lib/projects";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The link preview for a case study that has no screenshot (the ones with a screenshot use it, see page.tsx).
// Same look as the home card: cream paper, black bar, big uppercase type.
export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

const MUTED = "rgba(13,13,13,0.45)";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  const title = p ? p.title.toUpperCase() : "CASE STUDY";
  const kind = p ? p.kind.toUpperCase() : "";
  const text = p ? (PROJECT_META[p.slug] ?? p.summary) : "";
  // "Case study: BazaarBox, a Flutter ... Built by Zaka Ullah Waheed." reads better on the card without the label
  // and without the byline (the card header already says who)
  const bare = text.replace(/^Case study:\s*/i, "").replace(/\s*(Built )?by Zaka Ullah Waheed\.?$/i, "");
  const line = bare.charAt(0).toUpperCase() + bare.slice(1);
  const chips = p ? p.chips.slice(0, 6).join(" · ").toUpperCase() : "";
  // Long names must still fit on one card
  const titleSize = title.length > 16 ? 92 : title.length > 11 ? 120 : 148;

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
        <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: "100%", background: "#0d0d0d" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.22em", color: MUTED, textTransform: "uppercase" }}>
            {"CASE STUDY · " + kind}
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "0.18em", color: "rgba(13,13,13,0.35)", textTransform: "uppercase" }}>
            ZAKA ULLAH WAHEED
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: titleSize,
              fontWeight: 900,
              color: "#0d0d0d",
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "rgba(13,13,13,0.6)",
              lineHeight: 1.35,
              marginTop: 32,
              maxWidth: 980,
            }}
          >
            {line}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "0.14em", color: "rgba(13,13,13,0.35)", textTransform: "uppercase" }}>
            {chips}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.18em", color: MUTED, textTransform: "uppercase" }}>
            zaka-portfolio-two.vercel.app
          </span>
        </div>
      </div>
    ),
    size
  );
}
