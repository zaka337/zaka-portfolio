"use client";

import { useEffect, useState } from "react";

/* The current time, as a state that follows the clock. Starts as null so the server and the first
   paint agree, then ticks (once a second by default). */
export function useNow(ms = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
