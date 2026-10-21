"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { play, soundOn, unlockSound } from "@/lib/sound";

/* The always-listening half of sound (lib/sound.ts). It does nothing at all while sound is off.
   With it on, it plays a page turn when the visitor moves to another page, a chirp on the phone
   page, a click when the theme or the lamp switches, and a chime when a secret is found. The
   sounds that belong to one feature (typing, printing, squashing) are played by that feature. */

export default function Sound() {
  const pathname = usePathname();
  const first = useRef(true);

  // After a reload with sound on, the first tap or key press wakes the audio up again
  useEffect(() => {
    const wake = () => unlockSound();
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; } // landing on a page is not turning one
    if (!soundOn()) return;
    play("page");
    if (pathname === "/contact") {
      const id = window.setTimeout(() => play("ring"), 380);
      return () => window.clearTimeout(id);
    }
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const mo = new MutationObserver(() => play("switch"));
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const onSecret = () => play("chime");
    window.addEventListener("zk-secret", onSecret);
    return () => {
      mo.disconnect();
      window.removeEventListener("zk-secret", onSecret);
    };
  }, []);

  return null;
}
