import Link from "next/link";
import { HUB_TEASER } from "@/lib/tools";
import "./toolsdoor.css";

/* The home screen's way into the tools hub (/tools): a small outlined pill, so a visitor can find the free tools and the
   services without knowing an address. On a desktop it sits just above the "open for work" line at the bottom; on a phone
   it takes the empty row under the name. It is plain text and CSS: nothing runs while it sits there, and it does not
   prefetch the hub, so the home page's first load stays as light as before. */

export default function ToolsDoor() {
  return (
    <div className="home-tools-wrap">
      <div className="home-enter home-enter-5">
        <Link href="/tools" prefetch={false} className="home-tools" aria-label="Free tools and services: a website health check, AI testing, hiring tools and more">
          <span>{HUB_TEASER}</span>
          <span className="home-tools-arrow" aria-hidden="true">{'→'}</span>
        </Link>
      </div>
    </div>
  );
}
