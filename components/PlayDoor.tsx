import Link from "next/link";
import "./playdoor.css";

/* The way into MINI MAYHEM from the home screen: a small round arcade sticker pinned beside the
   jaw of the 3D head (a ring of "PLAY MINI MAYHEM", the big-headed driver in the middle, an orange
   play button on the edge). It takes about a tenth of the room the old wide pill did. It sits still:
   hover or keyboard focus and the ring spins, the car bounces and its wheels turn; a couple of
   seconds after the page opens it gives one small wiggle so people notice it. Pure CSS, nothing
   runs while it sits there. */

export default function PlayDoor() {
  return (
    <div className="home-play-wrap">
      <div className="home-enter home-enter-5">
        <Link href="/mini-mayhem" className="home-play" aria-label="Play MINI MAYHEM, a free 3D racing game" title="Play MINI MAYHEM, a free 3D racing game">
          <svg className="hp-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <defs><path id="hp-circ" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0" /></defs>
            <circle cx="50" cy="50" r="27.5" fill="#fff7dc" stroke="#0d1420" strokeWidth="1.6" />
            <g transform="rotate(-15 50 50)">
              <g className="hp-spin">
                <text fontSize="12" fontWeight="900" fill="#0d1420" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif">
                  <textPath href="#hp-circ" textLength="184" lengthAdjust="spacing">PLAY &bull; MINI MAYHEM &bull;</textPath>
                </text>
              </g>
            </g>
          </svg>
          <svg className="hp-car" viewBox="0 0 56 30" aria-hidden="true" focusable="false">
            <path d="M5 19c0-3 2-5 5-5h36c3 0 5 2 5 5v3H5z" fill="#0d1420" />
            <rect x="22" y="14" width="12" height="4" rx="2" fill="#0d1420" />
            <circle cx="28" cy="9" r="8.4" fill="#ffd23f" stroke="#0d1420" strokeWidth="1.1" />
            <path d="M19.6 8.4a8.4 8.4 0 0 1 16.8 0z" fill="#ff5a1f" stroke="#0d1420" strokeWidth="1.1" strokeLinejoin="round" />
            <circle cx="24.6" cy="10.8" r="1.5" fill="#0d1420" />
            <circle cx="31.4" cy="10.8" r="1.5" fill="#0d1420" />
            <path d="M24.4 14q3.6 2.6 7.2 0" stroke="#0d1420" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <g className="hp-wheel"><circle cx="14" cy="24" r="4.6" fill="#0d1420" /><circle cx="14" cy="24" r="1.8" fill="#f4f1e6" /><path d="M14 20.2v7.6M10.2 24h7.6" stroke="#f4f1e6" strokeWidth="0.9" /></g>
            <g className="hp-wheel"><circle cx="42" cy="24" r="4.6" fill="#0d1420" /><circle cx="42" cy="24" r="1.8" fill="#f4f1e6" /><path d="M42 20.2v7.6M38.2 24h7.6" stroke="#f4f1e6" strokeWidth="0.9" /></g>
          </svg>
          <span className="hp-go" aria-hidden="true">
            <svg viewBox="0 0 10 10" focusable="false"><path d="M3.1 1.6v6.8L8.6 5z" fill="#fff" /></svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
