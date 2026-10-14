"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { VT323 } from "next/font/google";
import NokiaSnake, { type SnakeHandle } from "@/components/NokiaSnake";
import type { Dir } from "@/lib/snakeGame";

const lcdFont = VT323({ weight: "400", subsets: ["latin"], display: "swap" });

const EMAIL = "zakas2379@gmail.com";
const COLS = 14;
const MAX_LEN = 160;

type Item = { label: string; lines: string[]; href?: string; copy?: string };

const ITEMS: Item[] = [
  { label: "EMAIL", lines: ["ZAKAS2379@", "GMAIL.COM"], href: `mailto:${EMAIL}`, copy: EMAIL },
  { label: "LINKEDIN", lines: ["ZAKA ULLAH", "WAHEED"], href: "https://www.linkedin.com/in/zaka-ullah-waheed-80380832a" },
  { label: "GITHUB", lines: ["GITHUB.COM/", "ZAKA337"], href: "https://github.com/zaka337" },
  { label: "INSTAGRAM", lines: ["@NOTXZAKA"], href: "https://www.instagram.com/notxzaka/" },
  { label: "WRITE MSG", lines: [] },
  { label: "SNAKE", lines: [] },
];
const WRITE = ITEMS.findIndex((i) => i.label === "WRITE MSG");
const SNAKE = ITEMS.findIndex((i) => i.label === "SNAKE");

const SNAKE_KEYS: Record<string, Dir> = { "2": "up", "8": "down", "4": "left", "6": "right" };

const MULTITAP: Record<string, string> = {
  "1": ".,?!'1",
  "2": "abc2", "3": "def3", "4": "ghi4", "5": "jkl5",
  "6": "mno6", "7": "pqrs7", "8": "tuv8", "9": "wxyz9",
  "0": " 0",
};

type Screen = "home" | "menu" | "detail" | "compose" | "sent" | "snake";

/* Key centres/sizes as % of the 1024px photo. */
const KEYS: { id: string; label: string; x: number; y: number; w: number; h: number }[] = [
  { id: "call", label: "Call key (OK)", x: 40.3, y: 58.3, w: 8, h: 5 },
  { id: "end", label: "End key (back)", x: 59.0, y: 58.3, w: 8, h: 5 },
  { id: "nav", label: "Menu key (OK)", x: 49.6, y: 58.9, w: 11, h: 5.4 },
  { id: "1", label: "1", x: 37.9, y: 65.7, w: 9.8, h: 5.8 },
  { id: "2", label: "2 (up)", x: 49.7, y: 67.2, w: 9.8, h: 5.8 },
  { id: "3", label: "3", x: 60.4, y: 65.7, w: 9.8, h: 5.8 },
  { id: "4", label: "4", x: 38.0, y: 71.5, w: 9.8, h: 5.8 },
  { id: "5", label: "5", x: 49.7, y: 72.9, w: 9.8, h: 5.8 },
  { id: "6", label: "6", x: 60.2, y: 71.5, w: 9.8, h: 5.8 },
  { id: "7", label: "7", x: 38.7, y: 77.2, w: 9.8, h: 5.8 },
  { id: "8", label: "8 (down)", x: 49.7, y: 78.4, w: 9.8, h: 5.8 },
  { id: "9", label: "9", x: 60.0, y: 77.2, w: 9.8, h: 5.8 },
  { id: "*", label: "Star (delete)", x: 39.9, y: 83.1, w: 9.8, h: 5.8 },
  { id: "0", label: "0 (space)", x: 50.6, y: 84.1, w: 9.8, h: 5.8 },
  { id: "#", label: "Hash", x: 59.7, y: 83.1, w: 9.8, h: 5.8 },
];

function autoCap(s: string): string {
  return s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

function wrap(text: string): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/( )/)) {
    let w = word;
    while (w.length > COLS) {
      if (cur) { lines.push(cur); cur = ""; }
      lines.push(w.slice(0, COLS));
      w = w.slice(COLS);
    }
    if ((cur + w).length > COLS) {
      lines.push(cur.trimEnd());
      cur = w === " " ? "" : w;
    } else {
      cur += w;
    }
  }
  lines.push(cur);
  return lines;
}

const pad = (left: string, right: string) =>
  left + " ".repeat(Math.max(1, COLS - left.length - right.length)) + right;

export default function NokiaPhone() {
  const [screen, setScreen] = useState<Screen>("home");
  const [sel, setSel] = useState(0);
  const [item, setItem] = useState(0);
  const [text, setText] = useState("");
  const [flash, setFlash] = useState("");
  const [caretOn, setCaretOn] = useState(true);
  const tap = useRef({ key: "", at: 0, idx: 0 });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snakeRef = useRef<SnakeHandle>(null);

  useEffect(() => {
    const t = setInterval(() => setCaretOn((c) => !c), 520);
    return () => {
      clearInterval(t);
      clearTimeout(flashTimer.current);
      clearTimeout(sentTimer.current);
    };
  }, []);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(""), 1500);
  }, []);

  const open = useCallback((it: Item) => {
    if (!it.href) return;
    if (it.href.startsWith("mailto:")) window.location.href = it.href;
    else window.open(it.href, "_blank", "noopener,noreferrer");
  }, []);

  const send = useCallback(() => {
    const body = autoCap(text).trim();
    if (!body) { showFlash("EMPTY MSG"); return; }
    const href = `mailto:${EMAIL}?subject=${encodeURIComponent("Hi Zaka (from your portfolio)")}&body=${encodeURIComponent(body + "\n")}`;
    setScreen("sent");
    window.location.href = href;
    clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setScreen("menu"), 2600);
  }, [text, showFlash]);

  const typeChar = useCallback((ch: string) => {
    setText((t) => (t.length < MAX_LEN ? t + ch : t));
  }, []);

  const multitap = useCallback((k: string) => {
    const set = MULTITAP[k];
    if (!set) return;
    const now = performance.now();
    const t = tap.current;
    if (t.key === k && now - t.at < 900) {
      t.idx = (t.idx + 1) % set.length;
      t.at = now;
      setText((s) => s.slice(0, -1) + set[t.idx]);
    } else {
      t.key = k; t.idx = 0; t.at = now;
      typeChar(set[0]);
    }
  }, [typeChar]);

  const back = useCallback(() => {
    tap.current.key = "";
    setScreen((s) => (s === "detail" || s === "compose" || s === "sent" || s === "snake" ? "menu" : "home"));
  }, []);

  const ok = useCallback(() => {
    if (screen === "home") { setScreen("menu"); return; }
    if (screen === "menu") {
      if (sel === WRITE) { setScreen("compose"); return; }
      if (sel === SNAKE) { setScreen("snake"); return; }
      setItem(sel); setScreen("detail"); return;
    }
    if (screen === "snake") { snakeRef.current?.action(); return; }
    if (screen === "detail") { open(ITEMS[item]); return; }
    if (screen === "compose") send();
  }, [screen, sel, item, open, send]);

  const press = useCallback((id: string) => {
    if (id === "end") { back(); return; }
    if (id === "call" || id === "nav") { ok(); return; }

    if (screen === "home") { setScreen("menu"); return; }
    if (screen === "snake") {
      if (SNAKE_KEYS[id]) snakeRef.current?.turn(SNAKE_KEYS[id]);
      else if (id === "5") snakeRef.current?.action();
      return;
    }
    if (screen === "compose") {
      if (id === "*") { setText((t) => t.slice(0, -1)); tap.current.key = ""; return; }
      if (MULTITAP[id]) multitap(id);
      return;
    }
    if (screen === "menu") {
      if (id === "2") setSel((s) => (s + ITEMS.length - 1) % ITEMS.length);
      if (id === "8") setSel((s) => (s + 1) % ITEMS.length);
      return;
    }
    if (screen === "detail" && id === "0" && ITEMS[item].copy) {
      navigator.clipboard?.writeText(ITEMS[item].copy!).then(() => showFlash("COPIED!"), () => showFlash("COPY FAILED"));
    }
  }, [screen, item, ok, back, multitap, showFlash]);

  /* Physical keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      const k = e.key;
      const inControl = el instanceof Element && el.closest("button, a, input, textarea, [contenteditable]");
      const steer = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" } as Record<string, Dir>)[k];
      if (inControl) {
        // While playing Snake the arrow keys steer even if a keypad button has focus
        const onPhone = el instanceof Element && el.closest(".nk");
        if (!(screen === "snake" && onPhone && steer)) return;
      }
      if (screen === "snake") {
        if (steer) { e.preventDefault(); snakeRef.current?.turn(steer); }
        else if (k === "Enter" || k === " ") { e.preventDefault(); snakeRef.current?.action(); }
        else if (k === "Escape" || k === "Backspace") { e.preventDefault(); back(); }
        return;
      }
      if (screen === "compose" && k.length === 1) {
        e.preventDefault();
        typeChar(k);
        return;
      }
      if (k === "Enter") { e.preventDefault(); ok(); }
      else if (k === "Escape") { e.preventDefault(); back(); }
      else if (k === "Backspace" && screen === "compose") { e.preventDefault(); setText((t) => t.slice(0, -1)); }
      else if (k === "Backspace") { back(); }
      else if (k === "ArrowUp" && screen === "menu") { e.preventDefault(); setSel((s) => (s + ITEMS.length - 1) % ITEMS.length); }
      else if ((k === "ArrowDown" && screen === "menu") || (screen === "home" && (k === " " || k === "ArrowDown"))) {
        e.preventDefault();
        if (screen === "home") setScreen("menu");
        else setSel((s) => (s + 1) % ITEMS.length);
      }
      else if (screen === "detail" && k === "0") press("0");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, ok, back, press, typeChar]);

  /* LCD rows */
  const rows: { t: string; inv?: boolean }[] = [];
  if (screen === "menu") {
    rows.push({ t: pad("MENU", `${sel + 1}/${ITEMS.length}`) });
    const top = Math.min(Math.max(0, sel - 1), ITEMS.length - 4);
    ITEMS.slice(top, top + 4).forEach((it, i) => {
      const idx = top + i;
      rows.push({ t: `${idx + 1} ${it.label}`.padEnd(COLS), inv: idx === sel });
    });
  } else if (screen === "detail") {
    const it = ITEMS[item];
    rows.push({ t: it.label });
    it.lines.forEach((l) => rows.push({ t: l }));
    while (rows.length < 4) rows.push({ t: "" });
    rows.push({ t: flash || (it.copy ? "OK:OPEN 0:COPY" : "OK:OPEN") });
  } else if (screen === "compose") {
    rows.push({ t: pad("WRITE MSG", `${text.length}`) });
    const lines = wrap(autoCap(text));
    const last = lines.slice(-3);
    while (last.length < 3) last.push("");
    const ci = last.length - 1;
    last.forEach((l, i) => rows.push({ t: i === ci && caretOn ? l + "_" : l }));
    rows.push({ t: flash || "OK:SEND *:DEL" });
  } else if (screen === "sent") {
    rows.push({ t: "MESSAGE READY" }, { t: "" }, { t: "OPENING MAIL" }, { t: "IN YOUR APP" }, { t: "" });
  }

  return (
    <div className="nk">
      <Image
        src="/mobile.jpg"
        alt="Nokia 3310 showing the words CALL ME"
        width={1024}
        height={1024}
        priority
        sizes="(max-width: 640px) 80vw, (max-width: 1080px) 42vw, 460px"
        draggable={false}
        className="nk-img"
      />

      {screen !== "home" && (
        <div className={`nk-lcd ${lcdFont.className}`} aria-live={screen === "snake" ? "off" : "polite"}>
          {screen === "snake" ? (
            <NokiaSnake ref={snakeRef} />
          ) : (
            rows.map((r, i) => (
              <div key={i} className={`nk-row${r.inv ? " nk-inv" : ""}`}>{r.t || " "}</div>
            ))
          )}
        </div>
      )}

      {KEYS.map((k) => (
        <button
          key={k.id}
          type="button"
          className={`nk-key${screen === "home" && k.id === "nav" ? " nk-pulse" : ""}`}
          aria-label={k.label}
          onClick={() => press(k.id)}
          style={{ left: `${k.x}%`, top: `${k.y}%`, width: `${k.w}%`, height: `${k.h}%` }}
        />
      ))}
    </div>
  );
}
