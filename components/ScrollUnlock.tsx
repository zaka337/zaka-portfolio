"use client";

import { useEffect } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";

/* globals.css locks html/body for the 3D home page; server-rendered pages that
   scroll normally drop this in to release the lock.

   The lock is released in an effect, after the browser has already tried to jump to a #section in the address, and
   while the page could not scroll. So a link such as /services#audit used to land at the top. Once the lock is off,
   this scrolls to that section itself. */
export default function ScrollUnlock() {
  useScrollUnlock();
  useEffect(() => {
    let id = "";
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { /* a malformed hash: stay at the top */ }
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}
