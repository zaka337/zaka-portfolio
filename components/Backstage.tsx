"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SECRETS, foundList } from "@/lib/secrets";
import { MAKING, NOTE } from "@/lib/backstage";
import "./backstage.css";

/* /backstage: opens once all twelve hidden things have been found (lib/secrets.ts, kept in this
   visitor's own browser). Until then it only shows how many are found and a nudge for each one that
   is missing. It is a game's reward, not a lock on anything private: nothing here is secret. */

export default function Backstage() {
  const [have, setHave] = useState<string[] | null>(null);

  useEffect(() => {
    const read = () => setHave([...foundList()]);
    read();
    window.addEventListener("zk-secret", read);
    return () => window.removeEventListener("zk-secret", read);
  }, []);

  // Nothing until the visitor's own list has been read, so there is no flash of the wrong view
  if (have === null) return <main className="bs-root" />;

  const open = SECRETS.every((s) => have.includes(s.id));

  return (
    <main className="bs-root">
      <div className="bs-ghost" aria-hidden="true">{open ? "12" : have.length}</div>

      <div className="bs-content">
        <p className="bs-kicker">{open ? "ALL TWELVE FOUND" : `LOCKED ${'·'} ${have.length} OF ${SECRETS.length} FOUND`}</p>
        <h1 className="bs-title">{open ? <>Backstage.</> : <>Not yet.</>}</h1>

        {open ? (
          <>
            <div className="bs-note">
              {NOTE.map((t, i) => <p key={i}>{t}</p>)}
            </div>

            <h2 className="bs-h2">How each one works</h2>
            <ol className="bs-list">
              {SECRETS.map((s, i) => (
                <li key={s.id} style={{ ["--i" as string]: i } as React.CSSProperties}>
                  <span className="bs-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="bs-body">
                    <strong>{s.name}</strong>
                    <span>{MAKING[s.id]}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="bs-actions">
              <Link className="bs-btn is-main" href="/contact-me">Start a project brief</Link>
              <Link className="bs-btn" href="/">Back to the face</Link>
            </div>
          </>
        ) : (
          <>
            <p className="bs-sub">
              This page opens when every hidden thing on the site has been found. Here is where you stand.
            </p>
            <ol className="bs-list">
              {SECRETS.map((s, i) => {
                const got = have.includes(s.id);
                return (
                  <li key={s.id} className={got ? "is-got" : "is-missing"} style={{ ["--i" as string]: i } as React.CSSProperties}>
                    <span className="bs-n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="bs-body">
                      <strong>{got ? s.name : "???"}</strong>
                      <span>{got ? "Found." : s.hint}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="bs-actions">
              <Link className="bs-btn" href="/">Back to the face</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
