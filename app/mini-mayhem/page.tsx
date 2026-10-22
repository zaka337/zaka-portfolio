import MayhemLoader from "@/components/mayhem/MayhemLoader";

export default function MiniMayhemPage() {
  return (
    <>
      <MayhemLoader />
      {/* For search engines and screen readers while the game loads, and if scripts are off */}
      <noscript>
        <p style={{ position: "fixed", inset: 0, zIndex: 8001, display: "grid", placeItems: "center", background: "#9fd2f2", color: "#0d1420", font: "700 1rem Helvetica, Arial, sans-serif", textAlign: "center", padding: "2rem" }}>
          MINI MAYHEM is a 3D racing game and needs JavaScript. Turn it on to play, or head back to the portfolio.
        </p>
      </noscript>
    </>
  );
}
