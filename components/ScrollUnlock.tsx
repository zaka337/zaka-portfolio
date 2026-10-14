"use client";

import { useScrollUnlock } from "@/lib/scrollStory";

/* globals.css locks html/body for the 3D home page; server-rendered pages that
   scroll normally drop this in to release the lock. */
export default function ScrollUnlock() {
  useScrollUnlock();
  return null;
}
