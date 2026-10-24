"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import { SOCIAL } from "@/lib/site";
import { crumblePage } from "@/lib/crumble";
import { SECRETS, found, foundList } from "@/lib/secrets";
import { BUGS, squashedList } from "@/lib/bugs";
import { play, setSound, soundOn } from "@/lib/sound";
import { faceAct } from "@/lib/faceAct";
import { askInstall, getPwa } from "@/lib/pwa";
import "./terminal.css";

/* A secret command line, in the site's own ink-and-paper language (the same window as the
   Nokia page, set in monospace). Open it with the ` key, or by long-pressing the face on a
   phone. Nothing here is linked or documented on the page: it is for whoever goes looking.

   Its `rm -rf /` makes the whole page crumble into falling letters (lib/knockOver.ts, page
   mode) and a click "runs git restore .". */

type Line = { kind: "in" | "out" | "dim" | "err"; text: string; href?: string };

const COMMANDS = [
  "help", "whoami", "ls", "cat", "cd", "open", "neofetch", "theme", "sudo", "rm", "clear",
  "exit", "ping", "date", "echo", "pwd", "history", "snake", "git", "hello", "xray", "talk", "say", "camera", "secrets", "lamp", "tour", "sound", "print", "bugs", "fit", "meet", "estimate", "qa", "tldr", "search", "doodle", "race", "dissolve", "boom", "look", "boop", "squish", "install",
];

const WHERE: Record<string, { label: string; to: string; external?: boolean }> = {
  github: { label: "GitHub", to: SOCIAL.github, external: true },
  linkedin: { label: "LinkedIn", to: SOCIAL.linkedin, external: true },
  instagram: { label: "Instagram", to: SOCIAL.instagram, external: true },
  whatsapp: { label: "WhatsApp", to: "/whatsapp", external: true },
  email: { label: "email", to: `mailto:${SOCIAL.email}`, external: true },
  resume: { label: "the resume", to: "/resume" },
  about: { label: "about", to: "/about" },
  projects: { label: "projects", to: "/projects" },
  contact: { label: "the Nokia", to: "/contact" },
  brief: { label: "the project brief", to: "/contact-me" },
  hire: { label: "the hiring tools", to: "/hire" },
  fit: { label: "the job-fit check", to: "/hire#fit" },
  call: { label: "the call helper", to: "/hire#call" },
  estimate: { label: "the project estimator", to: "/hire#estimate" },
  qa: { label: "the QA challenge", to: "/qa-challenge" },
  tldr: { label: "the one-screen summary", to: "/tldr" },
  race: { label: "MINI MAYHEM", to: "/mini-mayhem" },
  home: { label: "home", to: "/" },
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* "did you mean": a command that starts with what was typed, or is one edit away from it */
function suggest(word: string) {
  const oneEdit = (a: string, b: string) => {
    if (a === b || Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) {
      if (a.slice(i + 1) === b.slice(i + 1)) return true;                   // one letter different
      return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // two swapped
    }
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1); // one missing
  };
  return COMMANDS.find((c) => word.length >= 2 && c.startsWith(word)) ?? COMMANDS.find((c) => oneEdit(word, c));
}

/* rm -rf /  (or /*, *, ., ~), with any extra flags such as --no-preserve-root */
function isWipe(args: string[]) {
  const flags = args.filter((a) => /^-[a-z]+$/i.test(a)).join("");
  const target = args.find((a) => !a.startsWith("-")) ?? "";
  return /r/i.test(flags) && /f/i.test(flags) && /^(\/\*?|\*|\.|~)$/.test(target);
}

function machine() {
  const ua = navigator.userAgent;
  const os =
    /iPhone|iPad|iPod/.test(ua) ? `iOS ${(/OS ([\d_]+)/.exec(ua)?.[1] ?? "").replace(/_/g, ".")}`.trim()
    : /Android ([\d.]+)/.test(ua) ? `Android ${/Android ([\d.]+)/.exec(ua)?.[1]}`
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux" : "unknown";
  const browser =
    /Edg\/([\d]+)/.exec(ua) ? `Edge ${/Edg\/([\d]+)/.exec(ua)?.[1]}`
    : /Firefox\/([\d]+)/.exec(ua) ? `Firefox ${/Firefox\/([\d]+)/.exec(ua)?.[1]}`
    : /CriOS\/([\d]+)/.exec(ua) ? `Chrome ${/CriOS\/([\d]+)/.exec(ua)?.[1]}`
    : /Chrome\/([\d]+)/.exec(ua) ? `Chrome ${/Chrome\/([\d]+)/.exec(ua)?.[1]}`
    : /Version\/([\d.]+).*Safari/.exec(ua) ? `Safari ${/Version\/([\d.]+)/.exec(ua)?.[1]}` : "a browser";
  return { os, browser };
}

export default function Terminal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { kind: "dim", text: "zaka.sh 1.0 · Zaka Ullah Waheed's portfolio shell" },
    { kind: "dim", text: 'type "help" to see what works. a few commands are not listed.' },
  ]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<Element | null>(null);   // what had focus before, so closing gives it back
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);                       // position in history while pressing up/down
  const run = useRef(0);                           // bumped on close: stops a running sequence
  const touch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  const push = useCallback((...ls: Line[]) => setLines((prev) => [...prev, ...ls].slice(-300)), []);

  const close = useCallback(() => {
    run.current++;
    setBusy(false);
    setOpen(false);
    (backRef.current as HTMLElement | null)?.focus?.();
  }, []);

  /* Open with ` (not while typing somewhere else), or from the long-press on the face */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Backquote" && e.key !== "`") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(".zt-window")) return; // the prompt handles its own
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("zk-terminal", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("zk-terminal", onEvent);
    };
  }, []);

  /* A hello for anyone who opens the browser's own console */
  useEffect(() => {
    const w = window as unknown as { __zkHello?: boolean };
    if (w.__zkHello) return;
    w.__zkHello = true;
    console.log(
      "%cZAKA.%c\nOh, you opened the console. Good instincts: I test what I build.\n\n" +
        "  press ` (backtick) for a secret terminal\n  long-press my face on a phone for the same\n  press Shift+X to see this page as a blueprint\n  or just say hi: /contact-me\n",
      "font: 900 30px/1.1 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.03em;",
      "font: 13px/1.7 ui-monospace, Menlo, Consolas, monospace;",
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    backRef.current = document.activeElement;
    found("terminal");
    // Desktop gets the cursor straight away. A phone only raises its keyboard from a tap, so
    // there the first tap on the window does it.
    if (!touch) inputRef.current?.focus();
  }, [open, touch]);

  // The prompt is disabled while a command runs; give the cursor back afterwards
  useEffect(() => {
    if (open && !busy && !touch) inputRef.current?.focus();
  }, [open, busy, touch]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [lines, open]);

  const go = useCallback((to: string) => {
    close();
    router.push(to);
  }, [close, router]);

  const external = useCallback((label: string, url: string) => {
    push({ kind: "out", text: `opening ${label}...` });
    if (url.startsWith("mailto:")) { window.location.href = url; return; }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) push({ kind: "dim", text: "the browser blocked the new tab. here it is:" }, { kind: "out", text: url, href: url });
  }, [push]);

  /* ── The commands ── */
  const crumble = useCallback(async (id: number) => {
    const gone = [
      "app/page.tsx", "app/layout.tsx", "components/AvatarScene.tsx", "components/NokiaPhone.tsx",
      "lib/projects.ts", "public/Avatar.glb", "public/Zaka-Ullah-Waheed-Resume.pdf", "node_modules/ (3,412 packages)",
    ];
    for (const f of gone) {
      push({ kind: "dim", text: `removed ${f}` });
      await sleep(110);
      if (run.current !== id) return;
    }
    push({ kind: "out", text: "1,337 files deleted." });
    await sleep(480);
    if (run.current !== id) return;
    push({ kind: "err", text: "...just kidding. hold on." });
    await sleep(650);
    if (run.current !== id) return;
    close();
    await sleep(220);
    await crumblePage();
  }, [push, close]);

  const hire = useCallback(async (id: number) => {
    push({ kind: "out", text: "[sudo] password for recruiter: " });
    await sleep(500);
    if (run.current !== id) return;
    push({ kind: "out", text: "********" });
    await sleep(450);
    if (run.current !== id) return;
    found("hire");
    push({ kind: "out", text: "access granted. good call." }, { kind: "dim", text: "opening the project brief..." });
    await sleep(900);
    if (run.current !== id) return;
    go("/contact-me");
  }, [push, go]);

  const ping = useCallback(async (id: number) => {
    push({ kind: "out", text: "PING zaka (Islamabad, PKT): 56 data bytes" });
    for (let i = 0; i < 3; i++) {
      await sleep(420);
      if (run.current !== id) return;
      push({ kind: "dim", text: `64 bytes from zaka: icmp_seq=${i} ttl=64 time=${(9 + Math.random() * 6).toFixed(1)} ms` });
    }
    await sleep(300);
    if (run.current !== id) return;
    push({ kind: "out", text: "3 packets transmitted, 3 received, 0% packet loss", }, { kind: "dim", text: "(open for work, reply guaranteed)" });
  }, [push]);

  const execute = useCallback((raw: string) => {
    const text = raw.trim();
    push({ kind: "in", text: `$ ${raw}` });
    if (!text) return;
    history.current.push(text);
    cursor.current = -1;

    const [cmd, ...args] = text.split(/\s+/);
    const c = cmd.toLowerCase();
    const rest = args.join(" ");
    const id = ++run.current;
    const out = (...t: string[]) => push(...t.map((x): Line => ({ kind: "out", text: x })));
    const dim = (...t: string[]) => push(...t.map((x): Line => ({ kind: "dim", text: x })));
    const sequence = (fn: (id: number) => Promise<void>) => { setBusy(true); fn(id).finally(() => { if (run.current === id) setBusy(false); }); };

    if (c === "help" || c === "?") {
      out("whoami            who is behind this");
      out("ls                what is in here");
      out("ls projects       the projects (tap one to open it)");
      out("open <where>      github linkedin instagram whatsapp email");
      out("                  resume about projects contact brief home");
      out("neofetch          this machine, this site");
      out("theme dark|light  switch the theme");
      out("sudo hire zaka    you know you want to");
      out("clear  exit       tidy up, leave");
      dim("a few commands are not listed. try things.");
    } else if (c === "whoami") {
      out("Zaka Ullah Waheed", "full-stack developer and QA automation engineer", "Islamabad, Pakistan · open for work");
    } else if (c === "ls" || c === "dir") {
      if (/^projects\/?$/.test(rest)) {
        PROJECTS.forEach((p) => push({ kind: "out", text: `${p.slug.padEnd(22)} ${p.title}`, href: `/projects/${p.slug}` }));
        dim("tap one to open it");
      } else if (!rest) {
        out("projects/   resume.pdf   contact/   about/   secrets/");
      } else {
        push({ kind: "err", text: `ls: ${rest}: no such file or directory` });
      }
    } else if (c === "cd") {
      if (/^projects\/?$/.test(rest)) go("/projects");
      else if (/^secrets\/?$/.test(rest)) push({ kind: "err", text: "cd: secrets: permission denied. nice try." });
      else if (!rest || rest === "~" || rest === "/") go("/");
      else push({ kind: "err", text: `cd: ${rest}: no such directory` });
    } else if (c === "cat") {
      if (/^resume(\.pdf)?$/.test(rest)) go("/resume");
      else if (/^secrets/.test(rest)) push({ kind: "err", text: "cat: secrets: permission denied" });
      else push({ kind: "err", text: `cat: ${rest || "(nothing)"}: no such file` });
    } else if (c === "open") {
      const dest = WHERE[rest.toLowerCase()];
      const slug = PROJECTS.find((p) => p.slug === rest.toLowerCase());
      if (dest) {
        if (dest.external) external(dest.label, dest.to);
        else { out(`going to ${dest.label}...`); setTimeout(() => go(dest.to), 250); }
      } else if (slug) {
        out(`opening ${slug.title}...`); setTimeout(() => go(`/projects/${slug.slug}`), 250);
      } else {
        push({ kind: "err", text: `open: where? try: ${Object.keys(WHERE).join(" ")}` });
      }
    } else if (c === "snake") {
      out("snake lives on the Nokia. opening it..."); setTimeout(() => go("/contact"), 300);
    } else if (c === "lamp" || c === "flashlight") {
      // Dispatched inside the Enter key press, so a phone may ask for motion access
      const off = /^off$/i.test(rest);
      out(off ? "lamp off." : "lamp on. move your cursor (or finger, or tilt the phone). Esc switches it off.");
      window.dispatchEvent(new CustomEvent("zk-lamp", { detail: !off }));
      close();
    } else if (c === "tour") {
      // Dispatched inside the Enter key press, like the others
      out("starting the tour. about a minute. Esc ends it.");
      window.dispatchEvent(new Event("zk-tour"));
      close();
    } else if (c === "fit" || c === "meet" || c === "call" || c === "estimate" || c === "qa") {
      const to = c === "fit" ? "/hire#fit" : c === "estimate" ? "/hire#estimate" : c === "qa" ? "/qa-challenge" : "/hire#call";
      out(c === "fit" ? "opening the job-fit check..." : c === "estimate" ? "opening the project estimator..." : c === "qa" ? "opening the QA challenge. good luck." : "opening the call helper...");
      setTimeout(() => go(to), 250);
    } else if (c === "search" || c === "find" || c === "k") {
      out("opening the search. (Ctrl K does the same, anywhere.)");
      window.dispatchEvent(new Event("zk-palette"));
      close();
    } else if (c === "doodle" || c === "draw") {
      out("hold D and move the mouse. the ink fades. Esc wipes it.");
      window.dispatchEvent(new Event("zk-doodle-hint"));
      close();
    } else if (c === "race" || c === "play" || c === "game" || c === "drive") {
      out("starting your engines. MINI MAYHEM is a 3D racing game.");
      setTimeout(() => go("/mini-mayhem"), 300);
    } else if (c === "dissolve" || c === "boom" || c === "shatter") {
      out("tap the cap, or: here goes. (hold on the face to spell words, tap to put it back.)");
      faceAct("dissolve", { goHome: () => go("/") });
      if (window.location.pathname === "/") close();
    } else if (c === "look" || c === "looks" || c === "scan") {
      const name = rest.trim();
      out(name ? `look: ${name}` : "next look. (real, gold, hologram, thermal, xray, toon: 'look gold' picks one.)");
      faceAct("look", { name: name || undefined, goHome: () => go("/") });
      if (window.location.pathname === "/") close();
    } else if (c === "boop") {
      out("boop.");
      faceAct("boop", { goHome: () => go("/") });
      if (window.location.pathname === "/") close();
    } else if (c === "squish") {
      out("press and drag his cheeks, mouth or chin. he springs back.");
      if (window.location.pathname !== "/") go("/");
      else {
        window.dispatchEvent(new CustomEvent("zk-say", { detail: { text: "DRAG MY CHEEKS, MOUTH OR CHIN.", ms: 3200 } }));
        close();
      }
    } else if (c === "install" || c === "pwa" || c === "offline") {
      const s = getPwa();
      out(s.installed ? "you are already using the installed app." : s.offlineReady ? "a full copy of this site is saved on this device, so it opens with no connection." : "saving a copy for offline use...");
      if (!s.installed) { askInstall(); close(); }
    } else if (c === "tldr") {
      out("the short version, on one screen...");
      setTimeout(() => go("/tldr"), 250);
    } else if (c === "sound") {
      // Turning sound on has to happen inside this key press: it is the only time a browser lets audio start
      const want = /^off$/i.test(rest) ? false : /^on$/i.test(rest) ? true : !soundOn();
      if (!setSound(want)) push({ kind: "err", text: "sound: this browser cannot make sound here" });
      else out(want ? "sound on: clacks, page turns, a printer tick. 'sound off' stops it." : "sound off.");
    } else if (c === "print" || c === "receipt") {
      out("printing...");
      window.dispatchEvent(new Event("zk-receipt"));
      close();
    } else if (c === "bugs") {
      const done = squashedList();
      out(`bugs closed: ${done.length} of ${BUGS.length}`);
      for (const b of BUGS) {
        if (done.includes(b.id)) push({ kind: "out", text: `[x] ${b.no}  ${b.name}` });
        else push({ kind: "dim", text: `[ ] ${b.no}  ???  ${b.hint}` });
      }
      if (done.length >= BUGS.length) out("all closed. QA approves.");
    } else if (c === "secrets" || c === "achievements") {
      const have = foundList();
      out(`secrets found: ${have.length} of ${SECRETS.length}`);
      for (const s of SECRETS) {
        if (have.includes(s.id)) push({ kind: "out", text: `[x] ${s.name}` });
        else push({ kind: "dim", text: `[ ] ???  ${s.hint}` });
      }
      if (have.length >= SECRETS.length) push({ kind: "out", text: "all found. backstage is open: /backstage", href: "/backstage" });
      else dim("find them all and something opens.");
    } else if (c === "camera" || c === "mirror" || c === "lookback") {
      // Like talk: dispatched right here, inside the Enter key press, so the browser may ask for the camera
      out("opening the camera... look at the screen, then turn your head. (Esc to turn it off)");
      window.dispatchEvent(new Event("zk-lookback"));
      close();
    } else if (c === "talk" || c === "listen" || c === "voice") {
      // Dispatched right here, inside the Enter key press: browsers only allow the microphone
      // and speech from a gesture
      out("listening... say: show me your projects");
      window.dispatchEvent(new Event("zk-voice"));
      close();
    } else if (c === "say") {
      if (rest) window.dispatchEvent(new CustomEvent("zk-voice-say", { detail: rest }));
      else dim("say what? try: say hello there");
    } else if (c === "xray" || c === "blueprint") {
      out("drawing the blueprint... (Esc to leave)");
      setTimeout(() => { close(); window.dispatchEvent(new Event("zk-xray")); }, 350);
    } else if (c === "neofetch") {
      const { os, browser } = machine();
      const up = Math.round(performance.now() / 1000);
      const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      out("zaka@portfolio", "--------------",
        `os       ${os}`, `browser  ${browser}`, `screen   ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
        `theme    ${theme}`, `motion   ${window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced (calm mode)" : "full"}`,
        `uptime   ${up}s (since you arrived)`, "stack    Next.js 16 · React 19 · three.js", "shell    zaka.sh 1.0");
    } else if (c === "theme") {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const want = /^dark$/i.test(rest) ? "dark" : /^light$/i.test(rest) ? "light" : cur === "dark" ? "light" : "dark";
      if (want !== cur) (document.querySelector(".theme-toggle") as HTMLButtonElement | null)?.click();
      out(`theme: ${want}`);
    } else if (c === "sudo") {
      if (/^hire (zaka|me)$/i.test(rest)) sequence(hire);
      else if (args[0]?.toLowerCase() === "rm") {
        if (isWipe(args.slice(1))) { setBusy(true); void crumble(id); }
        else push({ kind: "err", text: "rm: refusing. be braver." });
      } else if (/sandwich/.test(rest)) out("okay.");
      else push({ kind: "err", text: "recruiter is not in the sudoers file. this incident will be reported." });
    } else if (c === "rm") {
      if (isWipe(args)) { setBusy(true); void crumble(id); }
      else push({ kind: "err", text: "rm: refusing. be braver." });
    } else if (c === "git") {
      if (/^status$/.test(rest)) out("On branch main", "nothing to commit, working tree clean");
      else if (/^restore/.test(rest)) out("nothing to restore. (yet)");
      else dim("git: this is a portfolio, not a repository. (it is, really: github.com/zaka337)");
    } else if (c === "ping") {
      sequence(ping);
    } else if (c === "date") {
      out(new Date().toString());
    } else if (c === "echo") {
      out(rest);
    } else if (c === "pwd") {
      out("/home/zaka/portfolio");
    } else if (c === "history") {
      history.current.slice(0, -1).forEach((h, i) => dim(`${String(i + 1).padStart(3)}  ${h}`));
    } else if (c === "hello" || c === "hi" || c === "hey") {
      out("hi. nice to meet you.");
    } else if (c === "42") {
      out("the answer. what was the question?");
    } else if (c === "clear" || c === "cls") {
      setLines([]);
    } else if (c === "exit" || c === "quit" || c === "q") {
      close();
    } else {
      const s = suggest(c);
      push({ kind: "err", text: `zsh: command not found: ${cmd}` });
      if (s) dim(`did you mean "${s}"?`);
      else dim('type "help"');
    }
  }, [push, go, external, close, hire, ping, crumble]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = value;
    setValue("");
    execute(v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "`" || e.code === "Backquote") { e.preventDefault(); close(); return; }
    // Typewriter clacks, if sound is on (lib/sound.ts)
    if (e.key === "Enter") play("enter");
    else if ((e.key.length === 1 || e.key === "Backspace") && !e.ctrlKey && !e.metaKey) play("key");
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const h = history.current;
      if (!h.length) return;
      e.preventDefault();
      cursor.current = e.key === "ArrowUp"
        ? Math.min(h.length - 1, cursor.current + 1)
        : Math.max(-1, cursor.current - 1);
      setValue(cursor.current === -1 ? "" : h[h.length - 1 - cursor.current]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const word = value.trim().toLowerCase();
      if (!word || /\s/.test(word)) return;
      const hits = COMMANDS.filter((c) => c.startsWith(word));
      if (hits.length === 1) setValue(hits[0] + " ");
      else if (hits.length > 1) push({ kind: "dim", text: hits.join("  ") });
    }
  };

  /* Escape closes, from anywhere in the window */
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="zt-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="zt-window" role="dialog" aria-modal="true" aria-label="Terminal">
        <div className="zt-bar">
          <button type="button" className="zt-close" aria-label="Close the terminal" onClick={close}>{'×'}</button>
          <span className="zt-title">zaka@portfolio ~ %</span>
          <span className="zt-tag">TERMINAL</span>
        </div>
        <div className="zt-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
          {lines.map((l, i) =>
            l.href ? (
              <button
                key={i}
                type="button"
                className={`zt-line zt-${l.kind} zt-link`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (l.href!.startsWith("/")) go(l.href!);
                  else window.open(l.href!, "_blank", "noopener,noreferrer");
                }}
              >{l.text}</button>
            ) : (
              <div key={i} className={`zt-line zt-${l.kind}`}>{l.text}</div>
            ),
          )}
          <form className="zt-prompt" onSubmit={onSubmit}>
            <span className="zt-ps1" aria-hidden="true">$</span>
            <input
              ref={inputRef}
              className="zt-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={busy}
              aria-label="Command"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
            />
          </form>
          {touch && !focused && !busy && <div className="zt-line zt-dim zt-tap">tap here to type</div>}
        </div>
      </div>
    </div>
  );
}
