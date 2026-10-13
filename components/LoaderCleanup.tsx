"use client";

import { useEffect } from "react";

export default function LoaderCleanup() {
  useEffect(() => {
    const l = document.getElementById("zk-loader");
    if (l) setTimeout(() => l.remove(), 700);
  }, []);
  return null;
}
