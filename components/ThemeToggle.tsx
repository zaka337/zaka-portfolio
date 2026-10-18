"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";
const KEY = "zk-theme";

/* The theme lives on <html data-theme>. A script in <head> sets it before first paint:
   light, unless this visitor chose dark before (saved here as zk-theme). The system
   setting is deliberately ignored, so light is the default for everyone. This
   component only flips it. Icons switch in CSS from the attribute, so there is no
   icon flash on load. */
export default function ThemeToggle() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme | null>(null);

  const apply = (next: Theme) => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    root.setAttribute("data-theme", next);
    setTheme(next);
    try { localStorage.setItem(KEY, next); } catch {}
    window.setTimeout(() => root.classList.remove("theme-anim"), 350);
  };

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      data-route={pathname === "/" ? "home" : "page"}
      aria-label="Dark mode"
      aria-pressed={theme === null ? undefined : theme === "dark"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
    >
      <svg className="tt-moon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8z" />
      </svg>
      <svg className="tt-sun" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
    </button>
  );
}
