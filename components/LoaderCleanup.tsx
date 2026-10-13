"use client";

import { useEffect } from "react";

export default function LoaderCleanup() {
  useEffect(() => {
    const dismiss = () => {
      const l = document.getElementById("zk-loader");
      if (!l || l.classList.contains("zk-done")) return;
      l.classList.add("zk-done");
      setTimeout(() => l.remove(), 650);
    };

    // Dismiss when 3D avatar signals it's ready, or after 4.2s fallback
    window.addEventListener("zk-ready", dismiss, { once: true });
    const t = setTimeout(dismiss, 4200);

    return () => {
      window.removeEventListener("zk-ready", dismiss);
      clearTimeout(t);
    };
  }, []);

  return null;
}
