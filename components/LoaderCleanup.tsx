"use client";

import { useEffect } from "react";

// Never remove #zk-loader from the DOM: React owns it, and removing it breaks
// later reconciliation (insertBefore/removeChild errors on navigation). Hide via CSS only.
export default function LoaderCleanup() {
  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = !!sessionStorage.getItem("zk-shown");
      sessionStorage.setItem("zk-shown", "1");
    } catch {}

    const dismiss = () => {
      document.getElementById("zk-loader")?.classList.add("zk-done");
    };

    if (alreadyShown) {
      dismiss();
      return;
    }

    window.addEventListener("zk-ready", dismiss, { once: true });
    const t = setTimeout(dismiss, 4200);

    return () => {
      window.removeEventListener("zk-ready", dismiss);
      clearTimeout(t);
    };
  }, []);

  return null;
}
