"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollUnlock } from "@/lib/scrollStory";
import { QA_BUGS, qaRank, qaScore } from "@/lib/qaBugs";
import { QA_ZAKA, SITE_URL } from "@/lib/site";
import { play } from "@/lib/sound";
import "./qa.css";

/* The QA challenge: a small made-up shop checkout with six bugs hidden in it, and the visitor is
   the tester. Use it like a customer, and like a tester (edges, odd input, double clicks); every
   bug you trigger lights up on the radar with what was wrong and the Playwright check that would
   have caught it. It is for QA learners and a demonstration of the craft: nothing is sent
   anywhere, the "shop" lives in this page. The bugs are in lib/qaBugs.ts. */

const NAMES = ["Notebook A5", "Ink pen set"];
const PRICES = [2500, 1250]; // cents, so nothing is ever 0.1 + 0.2
const BEST = "zk-qa-best";

const fmt = (c: number) => `${c < 0 ? "-" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* BUG-03 lives here: the plus sign is missing from the characters allowed before the @ */
const EMAIL_APP = /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}$/;
const EMAIL_REAL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Done = null | "won" | "gave-up";

export default function QaChallenge() {
  useScrollUnlock();
  const [qty, setQty] = useState(["1", "1"]);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [saves, setSaves] = useState(0);
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [errors, setErrors] = useState<{ email?: string; card?: string }>({});
  const [orders, setOrders] = useState<{ no: number; total: number }[]>([]);
  const [sending, setSending] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [newBug, setNewBug] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<Record<string, number>>({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<{ no: string; text: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<Done>(null);
  const [showScore, setShowScore] = useState(true);
  const [best, setBest] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const foundRef = useRef<string[]>([]);
  const startRef = useRef(0);
  const pending = useRef(0);
  const doubleFlag = useRef(false);
  const nextNo = useRef(1001);
  const doneRef = useRef<Done>(null);
  const hintCount = useRef(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const bannerTimer = useRef(0);

  useEffect(() => {
    try { const b = localStorage.getItem(BEST); if (b) setBest(Number(b)); } catch { /* storage refused */ }
  }, []);

  /* The clock starts with the first thing the tester does, and stops when it is over */
  const touch = useCallback(() => { if (!startRef.current) startRef.current = Date.now(); }, []);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (startRef.current && !doneRef.current) setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const finish = useCallback((kind: Exclude<Done, null>) => {
    if (doneRef.current) return;
    doneRef.current = kind;
    const secs = startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0;
    setSeconds(secs);
    setDone(kind);
    setShowScore(true);
    if (kind === "won") {
      const score = qaScore(QA_BUGS.length, hintCount.current, secs);
      try {
        const prev = Number(localStorage.getItem(BEST) || 0);
        if (score > prev) { localStorage.setItem(BEST, String(score)); setBest(score); }
      } catch { /* storage refused */ }
      play("chime");
    }
  }, []);

  const report = useCallback((id: string) => {
    if (foundRef.current.includes(id) || doneRef.current) return;
    foundRef.current = [...foundRef.current, id];
    setFound(foundRef.current);
    setNewBug(id);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setNewBug(null), 3800);
    play("squash");
    if (foundRef.current.length === QA_BUGS.length) window.setTimeout(() => finish("won"), 1400);
  }, [finish]);
  useEffect(() => () => window.clearTimeout(bannerTimer.current), []);

  // What the shop works out from the cart (in cents)
  const q = qty.map((v) => Math.trunc(Number(v) || 0));
  const lines = q.map((n, i) => n * PRICES[i]);
  const sub = lines[0] + lines[1];
  const rate = Math.min(100, saves * 10);
  const discount = Math.round((sub * rate) / 100);
  const afterDiscount = sub - discount;
  const hasItems = q.some((n) => n !== 0);
  const shipping = hasItems ? (sub > 5000 ? 0 : 500) : 0;   // BUG-05: "more than $50", the sign says "$50 or more"
  const tax = Math.round(afterDiscount * 0.08);
  const total = afterDiscount + shipping + tax;

  // Bugs that show up from the state of the cart alone
  useEffect(() => { if (q.some((n) => n < 0)) report("neg"); }, [qty]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (saves >= 2) report("stack"); }, [saves, report]);
  useEffect(() => { if (sub === 5000 && shipping === 500) report("ship"); }, [sub, shipping, report]);

  const setQ = (i: number, v: string) => { touch(); setQty((cur) => cur.map((x, k) => (k === i ? v.replace(/[^0-9-]/g, "").slice(0, 6) : x))); };
  const step = (i: number, d: number) => { touch(); setQty((cur) => cur.map((x, k) => (k === i ? String(Math.trunc(Number(x) || 0) + d) : x))); };

  const apply = () => {
    touch();
    const code = coupon.trim().toUpperCase();
    if (!code) { setCouponMsg("Enter a code"); return; }
    if (code === "SAVE10") { setSaves((s) => s + 1); setCouponMsg("Coupon applied: 10% off"); }   // BUG-02: no check that it was already used
    else setCouponMsg("That code is not valid");
  };

  const place = () => {
    touch();
    if (doneRef.current) return;
    const mail = email.trim();
    const errs: { email?: string; card?: string } = {};
    if (!EMAIL_APP.test(mail)) {
      errs.email = "Enter a valid email address";
      if (EMAIL_REAL.test(mail) && mail.split("@")[0].includes("+")) report("plus");
    }
    if (!card.trim()) errs.card = "Enter your card number";                                   // BUG-04: only checks that it is not empty
    setErrors(errs);
    if (errs.email) { emailRef.current?.focus(); return; }
    if (errs.card) { cardRef.current?.focus(); return; }

    const no = nextNo.current++;
    const cleaned = card.replace(/[\s-]/g, "");
    const badCard = !/^\d{13,19}$/.test(cleaned);
    const amount = total;
    if (pending.current > 0) doubleFlag.current = true;                                       // BUG-06: the button is still live while the first order is sent
    pending.current += 1;
    setSending(true);
    window.setTimeout(() => {
      pending.current -= 1;
      setOrders((o) => [...o, { no, total: amount }]);
      if (badCard) report("card");
      if (doubleFlag.current) { doubleFlag.current = false; report("double"); }
      if (pending.current === 0) setSending(false);
    }, 520);
  };

  const startOver = () => {
    setQty(["1", "1"]); setCoupon(""); setCouponMsg(""); setSaves(0); setEmail(""); setCard(""); setErrors({}); setOrders([]);
    pending.current = 0; doubleFlag.current = false; nextNo.current = 1001; setSending(false);
  };

  const giveHint = () => {
    touch();
    const next = QA_BUGS.find((b) => !foundRef.current.includes(b.id));
    if (!next || doneRef.current) return;
    const lvl = Math.min(2, (hintLevel[next.id] ?? 0) + 1);
    setHintLevel((h) => ({ ...h, [next.id]: lvl }));
    hintCount.current += 1;
    setHintsUsed(hintCount.current);
    setHint({ no: next.no, text: next.hints[lvl - 1] });
    play("tick");
  };

  const playAgain = () => {
    doneRef.current = null; setDone(null); setShowScore(true); foundRef.current = []; setFound([]); setNewBug(null); setHintLevel({}); setHintsUsed(0); hintCount.current = 0;
    setHint(null); startRef.current = 0; setSeconds(0); setCopied(false); startOver();
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const score = qaScore(found.length, hintsUsed, seconds);
  const revealed = done === "gave-up" || done === "won";
  const shareText = `I found ${found.length} of ${QA_BUGS.length} bugs in ${mmss(seconds)} on Zaka's QA challenge: ${SITE_URL}/qa-challenge`;
  const copy = async () => { try { await navigator.clipboard.writeText(shareText); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch { /* clipboard refused */ } };

  const newest = QA_BUGS.find((b) => b.id === newBug);

  return (
    <main className="qa-root">
      <nav className="qa-nav">
        <Link href="/">{'←'} BACK</Link>
        <span>QA CHALLENGE</span>
        <Link href="/hire">HIRE {'↗'}</Link>
      </nav>

      <header className="qa-hero">
        <p className="qa-label">QA CHALLENGE</p>
        <h1 className="qa-h1"><span>Break this</span><span>checkout.</span></h1>
        <p className="qa-lead">
          This little shop has <b>six bugs</b> hidden in it. You are the tester. Use it like a customer, then like a tester:
          the smallest numbers, odd input, things done twice. Every bug you trigger lights up on the radar, with the
          automated check that would have caught it.
        </p>
      </header>

      <div className="qa-bar" role="status" aria-live="polite">
        <span className="qa-stat"><b data-testid="found-count">{found.length}</b>/{QA_BUGS.length} <small>BUGS</small></span>
        <span className="qa-stat"><b>{mmss(seconds)}</b> <small>TIME</small></span>
        <span className="qa-stat"><b>{hintsUsed}</b> <small>HINTS</small></span>
        <span className="qa-bar-actions">
          {done ? (
            <button type="button" className="qa-btn" onClick={playAgain}>Play again</button>
          ) : (
            <>
              <button type="button" className="qa-btn" onClick={giveHint}>Hint</button>
              <button type="button" className="qa-btn" onClick={() => finish("gave-up")}>Give up</button>
            </>
          )}
        </span>
      </div>

      <div className="qa-grid">
        {/* ── The shop being tested ── */}
        <section className="qa-shop" aria-label="The checkout to test">
          <div className="qa-frame">
            <div className="qa-chrome" aria-hidden="true"><i /><i /><i /><span>tinyshop.test/checkout</span></div>
            <form className="qa-body" noValidate onSubmit={(e) => { e.preventDefault(); place(); }}>
              <h2 className="qa-shop-h">Your cart</h2>

              {NAMES.map((name, i) => (
                <div className="qa-line" key={name}>
                  <div className="qa-item"><b>{name}</b><span>{fmt(PRICES[i])} each</span></div>
                  <div className="qa-qty">
                    <button type="button" aria-label={`Decrease ${name}`} onClick={() => step(i, -1)}>{'−'}</button>
                    <input aria-label={`${name} quantity`} inputMode="numeric" autoComplete="off" value={qty[i]} onChange={(e) => setQ(i, e.target.value)} />
                    <button type="button" aria-label={`Increase ${name}`} onClick={() => step(i, 1)}>+</button>
                  </div>
                  <span className="qa-lt" data-testid={`line-${i}`}>{fmt(lines[i])}</span>
                </div>
              ))}

              <div className="qa-coupon">
                <label htmlFor="qa-coupon">Coupon</label>
                <div>
                  <input id="qa-coupon" value={coupon} placeholder="Try SAVE10" autoComplete="off" onChange={(e) => { setCoupon(e.target.value); touch(); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} />
                  <button type="button" className="qa-btn" onClick={apply}>Apply</button>
                </div>
                <p className="qa-msg" aria-live="polite">{couponMsg}</p>
              </div>

              <dl className="qa-sums">
                <div><dt>Subtotal</dt><dd data-testid="subtotal">{fmt(sub)}</dd></div>
                {saves > 0 && <div><dt>Discount (SAVE10)</dt><dd data-testid="discount">{rate}%</dd></div>}
                <div><dt>Shipping <small>Free on orders of $50 or more</small></dt><dd data-testid="shipping">{shipping === 0 ? "Free" : fmt(shipping)}</dd></div>
                <div><dt>Tax (8%)</dt><dd>{fmt(tax)}</dd></div>
                <div className="qa-total"><dt>Total</dt><dd data-testid="total">{fmt(total)}</dd></div>
              </dl>

              <div className="qa-field">
                <label htmlFor="qa-email">Email</label>
                <input id="qa-email" ref={emailRef} inputMode="email" autoComplete="off" value={email} aria-invalid={!!errors.email} aria-describedby="qa-email-e"
                  onChange={(e) => { setEmail(e.target.value); touch(); }} />
                <p id="qa-email-e" className="qa-err" role="alert">{errors.email ?? ""}</p>
              </div>
              <div className="qa-field">
                <label htmlFor="qa-card">Card number</label>
                <input id="qa-card" ref={cardRef} autoComplete="off" value={card} aria-invalid={!!errors.card} aria-describedby="qa-card-e"
                  onChange={(e) => { setCard(e.target.value); touch(); }} />
                <p id="qa-card-e" className="qa-err" role="alert">{errors.card ?? ""}</p>
              </div>

              <button type="button" className="qa-place" onClick={place}>{sending ? "Placing order..." : "Place order"}</button>

              <div className="qa-orders" aria-live="polite">
                <p className="qa-orders-h">Orders placed: <b data-testid="orders">{orders.length}</b></p>
                {orders.map((o) => <p className="qa-order" key={o.no}>Order #{o.no} confirmed {'·'} {fmt(o.total)}</p>)}
                {orders.length > 0 && <button type="button" className="qa-link" onClick={startOver}>Start a new cart</button>}
              </div>
            </form>
          </div>
        </section>

        {/* ── The radar and the bugs found ── */}
        <aside className="qa-side" aria-label="Bug radar">
          <div className="qa-radar" aria-hidden="true">
            <div className="qa-rings" />
            <div className="qa-sweep" />
            {QA_BUGS.map((b) => {
              const on = found.includes(b.id) || revealed;
              return (
                <span key={b.id} className={`qa-blip${on ? " is-on" : ""}${newBug === b.id ? " is-new" : ""}`} style={{ left: `${b.blip[0]}%`, top: `${b.blip[1]}%` }}>
                  {on ? b.no.slice(-2) : "?"}
                </span>
              );
            })}
          </div>

          {newest && (
            <div className="qa-banner" role="status">
              <span className="qa-banner-k">BUG FOUND</span>
              <span className="qa-banner-t">{newest.no}: {newest.title}</span>
            </div>
          )}
          {hint && !done && (
            <p className="qa-hint" key={hint.text}><b>Hint for {hint.no}.</b> {hint.text}</p>
          )}

          <ul className="qa-cards">
            {QA_BUGS.map((b, i) => {
              const open = found.includes(b.id) || revealed;
              const missed = revealed && !found.includes(b.id);
              return (
                <li key={b.id} className={`qa-card${open ? " is-open" : ""}${missed ? " is-missed" : ""}`} style={{ ["--i" as string]: i } as React.CSSProperties}>
                  {open ? (
                    <>
                      <div className="qa-card-h">
                        <span className="qa-card-no">{b.no}{missed ? " (not found)" : ""}</span>
                        <span className={`qa-sev is-${b.severity.toLowerCase()}`}>{b.severity}</span>
                      </div>
                      <h3 className="qa-card-t">{b.title}</h3>
                      <p>{b.what}</p>
                      <p className="qa-idea"><b>A tester would try:</b> {b.idea}</p>
                      <pre className="qa-code" aria-label="Playwright check that would catch it"><code>{b.code}</code></pre>
                    </>
                  ) : (
                    <div className="qa-card-h"><span className="qa-card-no">{b.no}</span><span className="qa-locked">Not found yet</span></div>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {done && showScore && (
        <div className="qa-over" role="dialog" aria-modal="true" aria-label="Your result">
          <div className="qa-score">
            <span className="qa-stamp" aria-hidden="true">{done === "won" ? "TICKET CLOSED" : "TICKET OPEN"}</span>
            <p className="qa-label">{done === "won" ? "ALL SIX FOUND" : "YOU GAVE UP"}</p>
            <h2 className="qa-score-h">{done === "won" ? qaRank(score) : `${found.length} of ${QA_BUGS.length} found`}</h2>
            <p className="qa-score-p">
              <b>{found.length} of {QA_BUGS.length}</b> bugs {'·'} <b>{mmss(seconds)}</b> {'·'} <b>{hintsUsed}</b> {hintsUsed === 1 ? "hint" : "hints"}
              {done === "won" && <> {'·'} score <b>{score}</b></>}
            </p>
            {done === "won" && best !== null && <p className="qa-note">Your best on this device: {best}</p>}
            <p className="qa-note">The bugs you missed, and the checks that catch them, are on the cards behind this.</p>
            <div className="qa-score-actions">
              <button type="button" className="qa-btn is-main" onClick={playAgain}>Play again</button>
              <button type="button" className="qa-btn" onClick={copy}>{copied ? "Copied" : "Copy my result"}</button>
              <a className="qa-btn" href={QA_ZAKA.url} target="_blank" rel="noopener noreferrer">Learn this at {QA_ZAKA.name} {'↗'}</a>
              <button type="button" className="qa-btn" onClick={() => setShowScore(false)}>Read the bugs</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
