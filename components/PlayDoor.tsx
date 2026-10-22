import Link from "next/link";
import "./playdoor.css";

/* The way into MINI MAYHEM from the home screen: a pill with a tiny car whose driver has a head
   far too big for it. On a computer it sits above the availability line; on a phone it sits in the
   empty row between the face and the bottom cards. Hover or keyboard focus and the car starts
   driving on the spot. Pure CSS, nothing runs while it sits there. */

export default function PlayDoor() {
  return (
    <div className="home-play-wrap">
      <div className="home-enter home-enter-5">
        <Link href="/mini-mayhem" className="home-play" aria-label="Play MINI MAYHEM, a 3D racing game">
          <svg className="hp-car" viewBox="0 0 56 30" aria-hidden="true" focusable="false">
            <path d="M5 19c0-3 2-5 5-5h36c3 0 5 2 5 5v3H5z" fill="currentColor" />
            <rect x="22" y="14" width="12" height="4" rx="2" fill="currentColor" />
            <circle cx="28" cy="9" r="8.4" fill="#ffd23f" />
            <path d="M19.6 8.4a8.4 8.4 0 0 1 16.8 0z" fill="#ff5a1f" />
            <circle cx="24.6" cy="10.4" r="1.6" fill="#0d1420" />
            <circle cx="31.4" cy="10.4" r="1.6" fill="#0d1420" />
            <path d="M24.2 14q3.8 2.8 7.6 0" stroke="#0d1420" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <g className="hp-wheel"><circle cx="14" cy="24" r="4.4" fill="#0d1420" /><circle cx="14" cy="24" r="1.7" fill="#f4f1e6" /><path d="M14 20.2v7.6M10.2 24h7.6" stroke="#f4f1e6" strokeWidth="0.9" /></g>
            <g className="hp-wheel"><circle cx="42" cy="24" r="4.4" fill="#0d1420" /><circle cx="42" cy="24" r="1.7" fill="#f4f1e6" /><path d="M42 20.2v7.6M38.2 24h7.6" stroke="#f4f1e6" strokeWidth="0.9" /></g>
          </svg>
          <span className="hp-text">PLAY <b>MINI MAYHEM</b></span>
        </Link>
      </div>
    </div>
  );
}
