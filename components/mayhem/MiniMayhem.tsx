"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MayhemEngine, type Phase, type Results, type HudData } from "./engine/engine";
import { RACERS } from "./engine/cars";
import type { Control } from "./engine/input";
import { fmtTime } from "./engine/util";
import "./mayhem.css";

/* MINI MAYHEM: the interface around the game (components/mayhem/engine/). The 3D world, the
   cars, the physics and the race live in the engine; this file is the menus, the HUD, the
   countdown, the results and the touch controls. The HUD numbers are written straight into the
   page (not through React state) so nothing re-renders sixty times a second. */

const MUTE_KEY = "zk-mayhem-muted";
const BEST_KEY = "zk-mayhem-best";
const ORD = ["1ST", "2ND", "3RD", "4TH"];
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const calmNow = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

type Screen = Phase | "loading" | "error";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch { return false; }
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <span className="mm-stat">
      <i>{label}</i>
      <b aria-label={`${label} ${v} of 5`}>{[1, 2, 3, 4, 5].map((k) => <u key={k} className={k <= v ? "on" : ""} />)}</b>
    </span>
  );
}

function TouchBtn({ ctl, label, cls, controls }: { ctl: Control; label: string; cls: string; controls: React.RefObject<MayhemEngine | null> }) {
  const [on, setOn] = useState(false);
  const end = (e: React.PointerEvent) => { controls.current?.controls.release(ctl, e.pointerId); setOn(false); };
  return (
    <button
      type="button"
      className={`mm-tb ${cls}${on ? " is-on" : ""}`}
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ } controls.current?.controls.press(ctl, e.pointerId); setOn(true); }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

export default function MiniMayhem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<MayhemEngine | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [racer, setRacer] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [driver, setDriver] = useState<{ name: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; good?: boolean } | null>(null);
  const [muted, setMuted] = useState(false);
  const [touchUi, setTouchUi] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(false);
  const [announce, setAnnounce] = useState("");
  const toastT = useRef(0);
  const countT = useRef(0);
  const refs = {
    speed: useRef<HTMLSpanElement>(null), bar: useRef<HTMLElement>(null), lap: useRef<HTMLSpanElement>(null), pos: useRef<HTMLSpanElement>(null),
    time: useRef<HTMLSpanElement>(null), lapTime: useRef<HTMLSpanElement>(null), best: useRef<HTMLSpanElement>(null), map: useRef<HTMLCanvasElement>(null),
  };
  const lastPlace = useRef(0);
  const mapBase = useRef<HTMLCanvasElement | null>(null);

  // the minimap's road, drawn once
  const buildMap = useCallback((e: MayhemEngine) => {
    const t = e.trackSamples, W = 150, H = 112, pad = 8;
    const b = t.bounds, sx = (W - pad * 2) / (b.maxX - b.minX), sz = (H - pad * 2) / (b.maxZ - b.minZ), s = Math.min(sx, sz);
    const ox = (W - (b.maxX - b.minX) * s) / 2 - b.minX * s, oz = (H - (b.maxZ - b.minZ) * s) / 2 - b.minZ * s;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i <= t.n; i += 3) { const k = i % t.n; const x = t.x[k] * s + ox, y = t.z[k] * s + oz; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.closePath();
    g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineWidth = 7; g.stroke();
    g.strokeStyle = "#f4f1e6"; g.lineWidth = 3.6; g.stroke();
    // the bridge in a different colour
    g.beginPath();
    for (let i = t.bridgeFrom; i <= t.bridgeTo; i += 2) { const x = t.x[i] * s + ox, y = t.z[i] * s + oz; if (i === t.bridgeFrom) g.moveTo(x, y); else g.lineTo(x, y); }
    g.strokeStyle = "#7dc4ff"; g.lineWidth = 3.6; g.stroke();
    const st = t.startIdx; g.fillStyle = "#ffd23f"; g.fillRect(t.x[st] * s + ox - 3, t.z[st] * s + oz - 3, 6, 6);
    mapBase.current = c;
    return { s, ox, oz, W, H };
  }, []);
  const mapT = useRef<{ s: number; ox: number; oz: number; W: number; H: number } | null>(null);

  const onHud = useCallback((d: HudData) => {
    const r = refs;
    if (r.speed.current) r.speed.current.textContent = String(d.speed);
    if (r.bar.current) r.bar.current.style.transform = `scaleX(${Math.min(1, d.speed / 170).toFixed(3)})`;
    if (r.lap.current) r.lap.current.textContent = `${d.lap}/${d.laps}`;
    if (r.pos.current) r.pos.current.textContent = `${d.place}/${d.cars}`;
    if (r.time.current) r.time.current.textContent = fmtTime(d.time);
    if (r.lapTime.current) r.lapTime.current.textContent = fmtTime(d.lapTime);
    if (r.best.current) r.best.current.textContent = d.best > 0 ? fmtTime(d.best) : "--:--.--";
    if (d.place !== lastPlace.current && d.time > 0) { lastPlace.current = d.place; setAnnounce(`Position ${d.place} of ${d.cars}`); }
    const cv = r.map.current, mt = mapT.current;
    if (cv && mt && mapBase.current) {
      const g = cv.getContext("2d")!;
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(mapBase.current, 0, 0);
      for (const m of d.map) {
        const x = m.x * mt.s + mt.ox, y = m.z * mt.s + mt.oz;
        g.beginPath(); g.arc(x, y, m.human ? 5 : 3.6, 0, 7);
        g.fillStyle = hex(RACERS[m.id].body); g.fill();
        if (m.human) { g.lineWidth = 2; g.strokeStyle = "#fff"; g.stroke(); }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((text: string, good = false, ms = 1500) => {
    setToast({ text, good });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  // start the engine once the page has painted
  useEffect(() => {
    document.documentElement.setAttribute("data-mayhem", "");
    const touch = matchMedia("(hover: none) and (pointer: coarse)").matches || /[?&]touch=1/.test(location.search);
    setTouchUi(touch);
    const checkPortrait = () => setPortrait(window.innerHeight > window.innerWidth);
    checkPortrait();
    window.addEventListener("resize", checkPortrait);
    let m = false;
    try { m = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* storage may be off */ }
    setMuted(m);
    let dead = false;
    const timer = window.setTimeout(() => {
      if (dead || !canvasRef.current) return;
      if (!hasWebGL()) { setErr("Your browser could not start 3D graphics (WebGL is switched off or not available)."); setScreen("error"); return; }
      const e = new MayhemEngine(canvasRef.current, {
        phase: (p) => { setScreen(p); if (p === "attract" || p === "select") { setCount(null); setResults(null); setPaused(false); } if (p === "finished") setAnnounce("You finished the race"); },
        countdown: (n) => { setCount(n); setAnnounce(n > 0 ? String(n) : "Go"); window.clearTimeout(countT.current); if (n === 0) countT.current = window.setTimeout(() => setCount(null), 900); },
        hud: onHud,
        checkpoint: (k, total) => showToast(`CHECKPOINT ${k}/${total}`),
        lap: (no, t, best) => { showToast(`${no >= 3 ? "FINAL LAP DONE" : `LAP ${no} DONE`}   ${fmtTime(t)}${best ? "   BEST LAP" : ""}`, best, 2200); setAnnounce(`Lap ${no} complete`); },
        results: (r) => {
          let rec = false;
          try { const b = JSON.parse(localStorage.getItem(BEST_KEY) || "null"); if (!b || r.time < b.time) { localStorage.setItem(BEST_KEY, JSON.stringify({ time: r.time })); rec = !!b; } } catch { /* fine */ }
          setRecord(rec); setResults(r);
          setAnnounce(`Race finished. You came ${ORD[r.place - 1] ?? r.place} in ${fmtTime(r.time)}`);
        },
        driver: (name, title) => setDriver({ name, title }),
        paused: (p) => setPaused(p),
        error: (msg) => { setErr(msg); setScreen("error"); },
      }, { muted: m, reduced: calmNow(), test: /[?&]test\b/.test(location.search) });
      engine.current = e;
      try {
        e.init();
        mapT.current = buildMap(e);
      } catch (ex) {
        console.error(ex);
        e.dispose(); engine.current = null;
        setErr("The game could not start on this device."); setScreen("error");
      }
    }, 60);
    return () => {
      dead = true;
      window.clearTimeout(timer); window.clearTimeout(toastT.current); window.clearTimeout(countT.current);
      window.removeEventListener("resize", checkPortrait);
      document.documentElement.removeAttribute("data-mayhem");
      engine.current?.dispose();
      engine.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // menu keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const en = engine.current;
      if (!en) return;
      if (screen === "select") {
        if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); const n = (racer + 1) % RACERS.length; setRacer(n); en.setRacer(n); }
        else if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); const n = (racer + RACERS.length - 1) % RACERS.length; setRacer(n); en.setRacer(n); }
        else if (e.code === "Escape") { e.preventDefault(); en.showTitle(); }
      } else if (screen === "intro" && (e.code === "Space" || e.code === "Enter" || e.code === "Escape")) { e.preventDefault(); en.skipIntro(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, racer]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    engine.current?.audio.setMuted(m);
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* fine */ }
  };
  const pick = (i: number) => { setRacer(i); engine.current?.setRacer(i); };
  const go = () => engine.current?.startRace();
  const again = () => { setResults(null); engine.current?.restart(); };
  const racing = screen === "racing" || screen === "countdown" || screen === "finished";

  return (
    <div className={`mm-stage${touchUi ? " mm-touchui" : ""}`} data-screen={screen}>
      <canvas ref={canvasRef} className="mm-canvas" aria-label="MINI MAYHEM game view" />
      <p className="mm-sr" role="status" aria-live="polite">{announce}</p>

      {screen === "loading" && (
        <div className="mm-center mm-loading" role="status">
          <div className="mm-logo"><span>MINI</span><b>MAYHEM</b></div>
          <div className="mm-loadbar"><i /></div>
          <p>BUILDING THE ISLAND</p>
        </div>
      )}

      {screen === "error" && (
        <div className="mm-center mm-panel mm-errbox" role="alert">
          <h1>Mini Mayhem could not start</h1>
          <p>{err}</p>
          <p>The rest of the portfolio works fine.</p>
          <div className="mm-btns">
            <button type="button" className="mm-btn" onClick={() => location.reload()}>TRY AGAIN</button>
            <Link className="mm-btn mm-btn-ghost" href="/projects">BACK TO THE PORTFOLIO</Link>
          </div>
        </div>
      )}

      {screen === "attract" && (
        <div className="mm-title">
          <div className="mm-logo mm-logo-big"><span>MINI</span><b>MAYHEM</b></div>
          <p className="mm-tag">TINY CARS. MASSIVE EGOS.</p>
          <div className="mm-btns">
            <button type="button" className="mm-btn mm-btn-hero" autoFocus onClick={() => { engine.current?.audio.start(); engine.current?.showSelect(); }}>PLAY</button>
          </div>
          <p className="mm-meta">{'3 LAPS · 4 RACERS · 1 ISLAND'}</p>
        </div>
      )}

      {(screen === "attract" || screen === "select") && (
        <div className="mm-topbar">
          <Link className="mm-chip" href="/projects">{'←'} PORTFOLIO</Link>
          <button type="button" className="mm-chip" aria-pressed={muted} onClick={toggleMute}>SOUND {muted ? "OFF" : "ON"}</button>
        </div>
      )}

      {screen === "select" && (
        <div className="mm-select">
          <h1 className="mm-h">PICK YOUR DRIVER</h1>
          <div className="mm-cards" role="radiogroup" aria-label="Driver">
            {RACERS.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={i === racer}
                className={`mm-card${i === racer ? " is-on" : ""}`}
                style={{ ["--c" as string]: hex(r.body), ["--a" as string]: hex(r.accent) } as React.CSSProperties}
                onClick={() => pick(i)}
                autoFocus={i === racer}
              >
                <span className="mm-card-no">0{i + 1}</span>
                <span className="mm-card-name">{r.name}</span>
                <span className="mm-card-title">{r.title.toUpperCase()}</span>
                <span className="mm-card-blurb">{r.blurb}</span>
                <span className="mm-stats"><Stat label="SPEED" v={r.stats.speed} /><Stat label="HANDLING" v={r.stats.handling} /><Stat label="DRIFT" v={r.stats.drift} /></span>
              </button>
            ))}
          </div>
          <div className="mm-btns">
            <button type="button" className="mm-btn mm-btn-ghost" onClick={() => engine.current?.showTitle()}>BACK</button>
            <button type="button" className="mm-btn mm-btn-hero" onClick={go}>RACE!</button>
          </div>
          <p className="mm-keys">
            {touchUi
              ? "Steer with the arrows, gas on the right, brake beside it."
              : <><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to drive <i>{'·'}</i> <kbd>SPACE</kbd> handbrake <i>{'·'}</i> <kbd>ESC</kbd> pause <i>{'·'}</i> <kbd>R</kbd> restart</>}
          </p>
        </div>
      )}

      {screen === "intro" && (
        <>
          {driver && (
            <div className="mm-plate" key={driver.name}>
              <b>{driver.name}</b><span>{driver.title.toUpperCase()}</span>
            </div>
          )}
          <button type="button" className="mm-chip mm-skip" onClick={() => engine.current?.skipIntro()} autoFocus>SKIP {'›'}</button>
        </>
      )}

      {racing && !(screen === "finished" && results) && (
        <div className={`mm-hud${screen === "countdown" ? " is-quiet" : ""}`}>
          <div className="mm-tl">
            <div className="mm-big"><i>LAP</i><span ref={refs.lap}>1/3</span></div>
            <div className="mm-big"><i>POS</i><span ref={refs.pos}>3/4</span></div>
          </div>
          <div className="mm-tr">
            <div className="mm-time"><i>TIME</i><span ref={refs.time}>0:00.00</span></div>
            <div className="mm-time mm-time-s"><i>LAP</i><span ref={refs.lapTime}>0:00.00</span></div>
            <div className="mm-time mm-time-s"><i>BEST</i><span ref={refs.best}>--:--.--</span></div>
            <canvas ref={refs.map} className="mm-map" width={150} height={112} aria-hidden="true" />
          </div>
          <div className="mm-speedo" aria-hidden="true">
            <div className="mm-speed"><span ref={refs.speed}>0</span><i>KM/H</i></div>
            <div className="mm-speedbar"><b ref={refs.bar} /></div>
          </div>
          <div className="mm-tools">
            <button type="button" className="mm-icon" aria-label="Pause" onClick={() => engine.current?.togglePause()}>II</button>
            <button type="button" className="mm-icon" aria-label="Restart the race" onClick={() => engine.current?.restart()}>R</button>
            <button type="button" className="mm-icon" aria-label={muted ? "Turn sound on" : "Mute"} aria-pressed={muted} onClick={toggleMute}>{muted ? "OFF" : "ON"}</button>
          </div>
          {toast && <div className={`mm-toast${toast.good ? " is-good" : ""}`} key={toast.text}>{toast.text}</div>}
        </div>
      )}

      {screen === "countdown" && count !== null && count > 0 && <div className="mm-count" key={count} aria-hidden="true">{count}</div>}
      {(screen === "racing" || screen === "countdown") && count === 0 && <div className="mm-count mm-go" aria-hidden="true">GO!</div>}
      {screen === "countdown" && count === null && <div className="mm-ready" aria-hidden="true">GET READY</div>}

      {touchUi && (screen === "racing" || screen === "countdown") && !paused && (
        <div className="mm-touch">
          <div className="mm-touch-l"><TouchBtn ctl="left" label={'◀'} cls="mm-tb-steer" controls={engine} /><TouchBtn ctl="right" label={'▶'} cls="mm-tb-steer" controls={engine} /></div>
          <div className="mm-touch-r"><TouchBtn ctl="hand" label="DRIFT" cls="mm-tb-hand" controls={engine} /><TouchBtn ctl="brake" label="BRAKE" cls="mm-tb-brake" controls={engine} /><TouchBtn ctl="gas" label="GAS" cls="mm-tb-gas" controls={engine} /></div>
        </div>
      )}
      {touchUi && portrait && !hintGone && racing && (
        <button type="button" className="mm-rotate" onClick={() => setHintGone(true)}>Turn your phone sideways for the best view (tap to hide)</button>
      )}

      {paused && racing && (
        <div className="mm-center mm-panel mm-pause" role="dialog" aria-modal="true" aria-label="Paused">
          <h1>PAUSED</h1>
          <div className="mm-btns mm-col">
            <button type="button" className="mm-btn mm-btn-hero" autoFocus onClick={() => engine.current?.setPaused(false)}>RESUME</button>
            <button type="button" className="mm-btn" onClick={() => engine.current?.restart()}>RESTART</button>
            <button type="button" className="mm-btn mm-btn-ghost" onClick={toggleMute}>SOUND {muted ? "OFF" : "ON"}</button>
            <button type="button" className="mm-btn mm-btn-ghost" onClick={() => engine.current?.showTitle()}>QUIT TO MENU</button>
          </div>
          <p className="mm-keys"><kbd>ESC</kbd> resume <i>{'·'}</i> <kbd>R</kbd> restart</p>
        </div>
      )}

      {screen === "finished" && !results && <div className="mm-count mm-go" aria-hidden="true">FINISH!</div>}

      {screen === "finished" && results && (
        <div className="mm-center mm-panel mm-results" role="dialog" aria-modal="true" aria-label="Race results">
          <p className="mm-kicker">RACE COMPLETE</p>
          <div className="mm-place">{ORD[results.place - 1] ?? results.place}<small>OF {RACERS.length}</small></div>
          <div className="mm-rline"><span>TIME</span><b>{fmtTime(results.time)}</b></div>
          <div className="mm-rline"><span>BEST LAP</span><b>{fmtTime(results.best)}</b></div>
          {record && <p className="mm-record">NEW PERSONAL BEST</p>}
          <ol className="mm-stand">
            {results.standings.map((s) => (
              <li key={s.name} className={s.human ? "is-me" : ""}>
                <i>{s.place}</i><b>{s.name}</b><span>{s.time !== null ? fmtTime(s.time) : "RACING"}</span>
              </li>
            ))}
          </ol>
          <div className="mm-btns">
            <button type="button" className="mm-btn mm-btn-hero" autoFocus onClick={again}>RACE AGAIN</button>
            <button type="button" className="mm-btn" onClick={() => engine.current?.showSelect()}>CHANGE DRIVER</button>
            <Link className="mm-btn mm-btn-ghost" href="/projects">BACK TO THE PORTFOLIO</Link>
          </div>
        </div>
      )}
    </div>
  );
}
