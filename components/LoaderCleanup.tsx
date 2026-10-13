"use client";

import { useEffect } from "react";

export default function LoaderCleanup() {
  useEffect(() => {
    const l = document.getElementById("zk-loader");

    // Already shown this session — remove immediately (CSS already hid it via zk-skip)
    const alreadyShown = sessionStorage.getItem("zk-shown");
    if (alreadyShown) {
      l?.remove();
      return;
    }

    // First visit — mark as shown and set up dismiss
    try { sessionStorage.setItem("zk-shown", "1"); } catch (e) {}

    const dismiss = () => {
      const el = document.getElementById("zk-loader");
      if (!el || el.classList.contains("zk-done")) return;
      el.classList.add("zk-done");
      setTimeout(() => el.remove(), 650);
    };

    window.addEventListener("zk-ready", dismiss, { once: true });
    const t = setTimeout(dismiss, 4200);

    return () => {
      window.removeEventListener("zk-ready", dismiss);
      clearTimeout(t);
    };
  }, []);

  return null;
}
