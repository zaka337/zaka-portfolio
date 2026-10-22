"use client";

import dynamic from "next/dynamic";

/* The game is only downloaded when this page is opened, and only in the browser: it needs WebGL,
   and it is a few hundred kilobytes the rest of the portfolio should never pay for. */
const MiniMayhem = dynamic(() => import("./MiniMayhem"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "grid", placeItems: "center", background: "#9fd2f2", color: "#0d1420", font: "900 italic 1rem Helvetica, Arial, sans-serif", letterSpacing: "0.3em" }}>
      LOADING MINI MAYHEM
    </div>
  ),
});

export default function MayhemLoader() {
  return <MiniMayhem />;
}
