"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SECRETS } from "@/lib/secrets";
import "./secrettoast.css";

/* The small note that appears when a visitor finds one of the hidden things (lib/secrets.ts).
   It is the first hint that there is a game here. If several are found at once, they take turns. */

interface Note { id: string; name: string; count: number; total: number }

export default function SecretToast() {
  const [note, setNote] = useState<Note | null>(null);
  const queue = useRef<Note[]>([]);
  const showing = useRef(false);
  const timer = useRef(0);

  useEffect(() => {
    const next = () => {
      window.clearTimeout(timer.current);
      const n = queue.current.shift();
      if (!n) { showing.current = false; setNote(null); return; }
      showing.current = true;
      setNote(n);
      // The last one is the big moment, so it stays longer
      timer.current = window.setTimeout(next, n.count >= n.total ? 9000 : 3600);
    };
    const onSecret = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; count: number; total: number }>).detail;
      queue.current.push({ id: d.id, name: SECRETS.find((s) => s.id === d.id)?.name ?? d.id, count: d.count, total: d.total });
      if (!showing.current) next();
    };
    window.addEventListener("zk-secret", onSecret);
    return () => {
      window.removeEventListener("zk-secret", onSecret);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!note) return null;
  const all = note.count >= note.total;

  return (
    <div className={`sx-toast${all ? " is-all" : ""}`} role="status" aria-live="polite">
      <div className="sx-count">{all ? `All ${note.total} found` : `Secret ${note.count} of ${note.total}`}</div>
      <div className="sx-name">{all ? "Backstage is open" : note.name}</div>
      {all && <Link className="sx-btn" href="/backstage">Go backstage</Link>}
    </div>
  );
}
