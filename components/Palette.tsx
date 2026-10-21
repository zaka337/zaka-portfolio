"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { search, ITEMS, type Item } from "@/lib/palette";
import { navigate } from "@/lib/nav";
import { RESUME_PDF } from "@/lib/resume";
import "./palette.css";

/* Search the whole site from the keyboard. Ctrl+K (Cmd+K on a Mac) or / opens it, or the round
   search button, or `search` in the terminal. Type a page, a project, a skill ("playwright"),
   or something to do ("dark mode", "cv"); the arrow keys move, Enter goes, Esc closes. It is a
   combobox over a listbox, so a screen reader announces the results as they change. What it can
   find is in lib/palette.ts (the hidden features are deliberately not in there). */

const TAG: Record<string, string> = { Page: "PAGE", Project: "PROJECT", Action: "DO", Link: "LINK" };
const EXAMPLES = ["react", "resume", "hire", "playwright"];

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** The title with the typed words picked out */
function Marked({ text, query }: { text: string; query: string }) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join("|")})`, "ig"));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}</>;
}

export default function Palette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);

  const results = useMemo(() => search(q), [q]);
  const active = Math.min(sel, Math.max(0, results.length - 1));

  const show = useCallback(() => {
    back.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQ("");
    setSel(0);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    const el = back.current;
    back.current = null;
    // Give the page its focus back, unless something has already taken it
    window.setTimeout(() => { if (el && el.isConnected && document.activeElement === document.body) el.focus({ preventScroll: true }); }, 0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) hide(); else show();
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !open && !typing(e.target)) {
        e.preventDefault();
        show();
      }
    };
    const onEvent = () => { if (!open) show(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("zk-palette", onEvent);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("zk-palette", onEvent); };
  }, [open, show, hide]);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
  }, [active, open, results]);

  const run = (it: Item) => {
    const a = it.act;
    hide();
    // Let the panel close first so a page change or a click on the page is not under it
    window.setTimeout(() => {
      if (a.t === "go") navigate(router, a.href);
      else if (a.t === "ext") window.open(a.href, "_blank", "noopener,noreferrer");
      else if (a.t === "mail") window.location.href = a.href;
      else if (a.id === "theme") document.querySelector<HTMLButtonElement>(".theme-toggle")?.click();
      else if (a.id === "tour") window.dispatchEvent(new Event("zk-tour"));
      else if (a.id === "access") document.querySelector<HTMLButtonElement>(".ax-btn")?.click();
      else if (a.id === "doodle") window.dispatchEvent(new Event("zk-doodle-hint"));
      else if (a.id === "resume") window.open(RESUME_PDF, "_blank", "noopener");
      else if (a.id === "copy") navigator.clipboard?.writeText(window.location.href.split("#")[0]).catch(() => {});
    }, 40);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); hide(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((active + 1) % Math.max(1, results.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((active + results.length - 1) % Math.max(1, results.length)); }
    else if (e.key === "Home") { e.preventDefault(); setSel(0); }
    else if (e.key === "End") { e.preventDefault(); setSel(Math.max(0, results.length - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) run(results[active]); }
    else if (e.key === "Tab") { e.preventDefault(); } // the panel is one field: keep the focus in it
  };

  return (
    <>
      <button type="button" className="pk-fab" aria-label="Search the site (Ctrl K)" title="Search (Ctrl K)" onClick={() => window.dispatchEvent(new Event("zk-palette"))}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="6.8" cy="6.8" r="4.6" /><path d="M10.4 10.4 14 14" />
        </svg>
      </button>

      {open && (
        <div className="pk-back" onMouseDown={(e) => { if (e.target === e.currentTarget) hide(); }}>
          <div className="pk" role="dialog" aria-modal="true" aria-label="Search the site">
            <div className="pk-field">
              <svg className="pk-mag" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <circle cx="6.8" cy="6.8" r="4.6" /><path d="M10.4 10.4 14 14" />
              </svg>
              <input
                ref={input}
                className="pk-input"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages, projects, skills..."
                role="combobox"
                aria-expanded="true"
                aria-controls="pk-list"
                aria-activedescendant={results[active] ? `pk-${results[active].id}` : undefined}
                aria-autocomplete="list"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <kbd className="pk-esc">ESC</kbd>
            </div>

            <div ref={list} id="pk-list" className="pk-list" role="listbox" aria-label={q ? "Results" : "Suggestions"}>
              {results.map((it, i) => (
                <button
                  key={it.id}
                  id={`pk-${it.id}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  tabIndex={-1}
                  className={`pk-row${i === active ? " is-on" : ""}`}
                  style={{ ["--i" as string]: Math.min(i, 9) } as React.CSSProperties}
                  onMouseMove={() => { if (i !== active) setSel(i); }}
                  onClick={() => run(it)}
                >
                  <span className="pk-text">
                    <span className="pk-title"><Marked text={it.title} query={q} /></span>
                    <span className="pk-hint">{it.hint}</span>
                  </span>
                  <span className="pk-meta">
                    <span className="pk-tag">{TAG[it.group]}</span>
                    <span className="pk-go" aria-hidden="true">{'↵'}</span>
                  </span>
                </button>
              ))}
              {results.length === 0 && (
                <div className="pk-empty">
                  <p>Nothing for {'“'}{q}{'”'}.</p>
                  <p className="pk-try">Try{" "}
                    {EXAMPLES.map((x) => <button key={x} type="button" className="pk-chip" onClick={() => { setQ(x); input.current?.focus(); }}>{x}</button>)}
                  </p>
                </div>
              )}
            </div>

            <div className="pk-foot" aria-hidden="true">
              <span><kbd>{'↑'}</kbd><kbd>{'↓'}</kbd> move</span>
              <span><kbd>{'↵'}</kbd> open</span>
              <span><kbd>ESC</kbd> close</span>
              <span className="pk-count">{results.length} of {ITEMS.length}</span>
            </div>
            <p className="pk-sr" role="status" aria-live="polite">{q ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}</p>
          </div>
        </div>
      )}
    </>
  );
}
