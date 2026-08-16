"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const AvatarScene = dynamic(() => import("@/components/AvatarScene"), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  return (
    <main className="portfolio-root">
      <AvatarScene />

      {/* TOP LEFT — name */}
      <div className="block-tl">
        <p className="label">YOU CAN CALL ME</p>
        <div className="nav-text">
          <h1 className="title-huge">ZAKA.</h1>
          <p className="title-sub">OR WHATEVER.</p>
        </div>
      </div>

      {/* TOP RIGHT — contact */}
      <Link href="/contact" className="block-tr nav-text" style={{ textDecoration: "none" }}>
        <p className="nav-item">SAY</p>
        <p className="nav-item">HI</p>
      </Link>

      {/* MID LEFT — about */}
      <div className="block-ml nav-text">
        <p className="nav-item">MORE</p>
        <p className="nav-item">ABOUT ME</p>
      </div>

      {/* MID RIGHT — role */}
      <div className="block-mr nav-text">
        <p className="nav-item">FRONTEND</p>
        <p className="nav-item">DEVELOPER</p>
      </div>

      {/* BOTTOM LEFT — projects */}
      <Link href="/projects" className="block-bl nav-text" style={{ textDecoration: "none" }}>
        <p className="nav-item">MY</p>
        <p className="nav-item">PROJECTS</p>
      </Link>

      {/* BOTTOM RIGHT — contact */}
      <div className="block-br nav-text">
        <p className="nav-item">CONTACT</p>
        <p className="nav-item">ME</p>
      </div>
    </main>
  );
}
