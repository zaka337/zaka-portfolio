import Link from "next/link";
import MayhemLoader from "@/components/mayhem/MayhemLoader";

export default function MiniMayhemPage() {
  return (
    <>
      <MayhemLoader />
      {/* The game fills the screen, so this is its page text for search engines and screen readers (not aria-hidden).
          It describes the game as it is: keep it in step with the controls and the track. */}
      <section className="sr-only" aria-label="About MINI MAYHEM">
        <h1>MINI MAYHEM: a free 3D racing game in your browser</h1>
        <p>
          MINI MAYHEM is a 3D arcade racing game built by Zaka Ullah Waheed. Four tiny cars with giant cartoon heads race three
          laps around an island with a military base and a long suspension bridge. Drive with the arrow keys or WASD, or with the
          touch controls on a phone. You can put your own face on the driver.
        </p>
        <Link href="/" tabIndex={-1}>Back to the portfolio of Zaka Ullah Waheed</Link>
      </section>
      <noscript>
        <p style={{ position: "fixed", inset: 0, zIndex: 8001, display: "grid", placeItems: "center", background: "#9fd2f2", color: "#0d1420", font: "700 1rem Helvetica, Arial, sans-serif", textAlign: "center", padding: "2rem" }}>
          MINI MAYHEM is a 3D racing game and needs JavaScript. Turn it on to play, or head back to the portfolio.
        </p>
      </noscript>
    </>
  );
}
