"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/* The only part of "Get drawn" that is on every page: a few lines that wait to be asked. The sheet itself (and the face tracker inside it)
   is fetched the first time someone asks, by `portrait` in the terminal, the "Get drawn" action in Ctrl+K, or the address /?portrait
   (the shareable card points there). */
const Sheet = dynamic(() => import("./Portrait"), { ssr: false });

export default function PortraitLoader() {
  const [want, setWant] = useState(false);

  useEffect(() => {
    const ask = () => setWant(true);
    window.addEventListener("zk-portrait", ask);
    let timer = 0;
    if (/[?&]portrait(=|&|$)/.test(window.location.search)) {
      // opened from a link: wait until the home page's loader and its build have finished, so the two never fight over the screen
      let tries = 0;
      const poll = () => {
        const d = document.documentElement;
        const loader = document.getElementById("zk-loader");
        const busy = (d.classList.contains("zb") && !d.classList.contains("zb-done")) || (!!loader && !loader.classList.contains("zk-done") && getComputedStyle(loader).display !== "none");
        if (!busy || ++tries > 80) setWant(true);
        else timer = window.setTimeout(poll, 250);
      };
      timer = window.setTimeout(poll, 400);
    }
    return () => { window.removeEventListener("zk-portrait", ask); window.clearTimeout(timer); };
  }, []);

  return want ? <Sheet openOnMount /> : null;
}
