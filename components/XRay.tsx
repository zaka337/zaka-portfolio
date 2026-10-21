"use client";

import { useEffect } from "react";
import "./xray.css";

/* Paper X-ray: "inspect element" for everyone. Press Shift+X (or run `xray` in the secret
   terminal) and the page it is on is redrawn as a blueprint: every part outlined and
   labelled over a dotted grid, with a title block like an engineering drawing. Hover or tap
   a part to measure it: its size, position, type and the distance to each screen edge.
   Esc, Shift+X or the close button leave.

   Nothing on the page is touched: this only lays a layer over it, and it removes
   everything it added when it leaves. While it is open, taps inspect instead of clicking. */

const SELECTOR =
  "main, header, footer, nav, section, article, aside, form, h1, h2, h3, h4, h5, p, a[href], button, img, canvas, " +
  "input, textarea, select, label, li, summary, [data-hot], [role='button'], .face-hit, .avatar-scene";
const SKIP = ".xr-layer, .zt-backdrop, .egg-layer, .egg-hint, .egg-tilt, [aria-hidden='true']:not(.avatar-scene), svg, script, style";
const MAX_ITEMS = 260;

interface Item {
  node: Element;
  box: HTMLDivElement;
  x: number; y: number; w: number; h: number;
  shown: boolean;
  label: string;
}

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function describe(node: Element) {
  const tag = node.tagName.toLowerCase();
  const id = node.id ? `#${node.id}` : "";
  const cls = typeof node.className === "string" ? node.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("xr-")).slice(0, 2) : [];
  return `${tag}${id}${cls.map((c) => "." + c).join("")}`;
}

function start(onExit: () => void) {
  const layer = make("div", "xr-layer");
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-label", "Blueprint view");
  const grid = make("div", "xr-grid");
  const wrap = make("div", "xr-boxes");
  const guides = (["t", "r", "b", "l"] as const).map((side) => {
    const line = make("div", `xr-guide xr-guide-${side}`);
    const dist = make("span", "xr-dist");
    line.appendChild(dist);
    line.hidden = true;
    return { line, dist, side };
  });

  const title = make("div", "xr-title");
  const head = make("div", "xr-title-head");
  const headName = make("b", "", "BLUEPRINT");
  const headWhere = make("span", "");
  const headSize = make("span", "");
  const headCount = make("span", "");
  head.append(headName, headWhere, headSize, headCount);
  const selTitle = make("div", "xr-sel-title", "Hover or tap a part to measure it");
  const selBody = make("div", "xr-sel-body");
  const foot = make("div", "xr-foot", "Shift+X or Esc to leave");
  title.append(head, selTitle, selBody, foot);

  const close = make("button", "xr-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Leave the blueprint view");

  layer.append(grid, wrap, ...guides.map((g) => g.line), title, close);
  document.body.appendChild(layer);

  let items: Item[] = [];
  let selected: Item | null = null;
  let raf = 0;
  let dead = false;

  /* Find the parts worth drawing: visible, big enough, and not a copy of the box around them */
  const gather = () => {
    const keep = selected?.node ?? null; // the part being measured stays selected through a redraw
    wrap.textContent = "";
    items = [];
    selected = null;
    const seen = new Set<string>();
    for (const node of Array.from(document.querySelectorAll(SELECTOR))) {
      if (items.length >= MAX_ITEMS) break;
      if (node.closest(SKIP) && !node.matches(".avatar-scene")) continue;
      const vis = (node as HTMLElement & { checkVisibility?: (o: object) => boolean }).checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true });
      if (vis === false) continue;
      const r = node.getBoundingClientRect();
      // Everything on this screen and a screen above and below it: scrolling brings the rest in
      if (r.width < 4 || r.height < 4 || r.bottom < -innerHeight || r.top > innerHeight * 2 || r.right < -innerWidth || r.left > innerWidth * 2) continue;
      const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
      if (seen.has(key)) continue; // the outer box is already drawn
      seen.add(key);

      const tag = node.tagName.toLowerCase();
      const href = node.getAttribute("href");
      let label = tag;
      if (href) label += ` → ${short(href.replace(/^https?:\/\/(www\.)?/, ""), 26)}`;
      else if (node.classList.length) label += `.${node.classList[0]}`;

      const box = make("div", `xr-box${href ? " is-link" : ""}${tag === "img" || tag === "canvas" ? " is-media" : ""}`);
      box.style.setProperty("--i", String(Math.min(items.length, 90)));
      box.appendChild(make("span", "xr-tag", label));
      wrap.appendChild(box);
      items.push({ node, box, x: NaN, y: NaN, w: NaN, h: NaN, shown: false, label });
    }
    headCount.textContent = `${items.length} parts`;
    selTitle.textContent = "Hover or tap a part to measure it";
    selBody.textContent = "";
    if (keep) {
      const again = items.find((it) => it.node === keep) ?? null;
      if (again) requestAnimationFrame(() => { if (!dead) select(again); }); // measured on the next frame
    }
  };

  /* Every frame: keep each outline on its part (the page scrolls, things animate) */
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (dead) return;
    const W = innerWidth, H = innerHeight;
    for (const it of items) {
      const r = it.node.getBoundingClientRect();
      const inView = r.width >= 4 && r.height >= 4 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
      if (!inView) {
        if (it.shown) { it.box.style.display = "none"; it.shown = false; }
        continue;
      }
      if (!it.shown) { it.box.style.display = ""; it.shown = true; it.x = NaN; }
      if (r.left !== it.x || r.top !== it.y || r.width !== it.w || r.height !== it.h) {
        it.x = r.left; it.y = r.top; it.w = r.width; it.h = r.height;
        it.box.style.transform = `translate(${r.left}px, ${r.top}px)`;
        it.box.style.width = `${r.width}px`;
        it.box.style.height = `${r.height}px`;
        it.box.classList.toggle("is-small", r.width < 64 || r.height < 18);
      }
    }
    placeGuides();
  };

  /* Distance from the picked part to each screen edge, like a design tool's measure lines */
  const placeGuides = () => {
    const s = selected;
    for (const g of guides) g.line.hidden = !s || !s.shown;
    if (!s || !s.shown) return;
    const W = innerWidth, H = innerHeight;
    const { x, y, w, h } = s;
    const cx = x + w / 2, cy = y + h / 2;
    const set = (g: (typeof guides)[number], left: number, top: number, len: number, vertical: boolean, value: number) => {
      g.line.style.left = `${left}px`;
      g.line.style.top = `${top}px`;
      g.line.style[vertical ? "height" : "width"] = `${Math.max(0, len)}px`;
      g.line.style[vertical ? "width" : "height"] = "0px";
      g.dist.textContent = String(Math.round(value));
    };
    set(guides[0], cx, 0, y, true, y);                      // top
    set(guides[1], x + w, cy, W - (x + w), false, W - (x + w)); // right
    set(guides[2], cx, y + h, H - (y + h), true, H - (y + h));  // bottom
    set(guides[3], 0, cy, x, false, x);                     // left
  };

  /* The smallest drawn part under the pointer */
  const pick = (px: number, py: number) => {
    let best: Item | null = null;
    let bestArea = Infinity;
    for (const it of items) {
      if (!it.shown) continue;
      if (px < it.x || px > it.x + it.w || py < it.y || py > it.y + it.h) continue;
      const area = it.w * it.h;
      if (area <= bestArea) { best = it; bestArea = area; }
    }
    // A link or button is what it does: pick it rather than the text inside it
    const control = best?.node.closest("a[href], button, [role='button']");
    if (best && control && control !== best.node) {
      const outer = items.find((it) => it.node === control && it.shown);
      if (outer) return outer;
    }
    return best;
  };

  const select = (it: Item | null) => {
    if (it === selected) return;
    selected?.box.classList.remove("is-sel");
    selected = it;
    selBody.textContent = "";
    if (!it) {
      selTitle.textContent = "Hover or tap a part to measure it";
      return;
    }
    it.box.classList.add("is-sel");
    // The title block hops to the top when the part being measured is in the lower half
    title.classList.toggle("is-top", it.y + it.h / 2 > innerHeight * 0.5);
    const node = it.node as HTMLElement;
    const cs = getComputedStyle(node);
    selTitle.textContent = describe(node);
    const lines: string[] = [`${Math.round(it.w)} × ${Math.round(it.h)}  at ${Math.round(it.x)}, ${Math.round(it.y)}`];
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && node.children.length < 4) {
      lines.push(`type  ${cs.fontSize} · ${cs.fontWeight} · ${cs.fontFamily.split(",")[0].replace(/["']/g, "")}`);
      lines.push(`ink   ${cs.color}`);
      lines.push(`text  "${short(text, 38)}"`);
    }
    const href = node.getAttribute("href") ?? node.getAttribute("src");
    if (href) lines.push(`${node.hasAttribute("href") ? "href" : "src "}  ${short(href, 40)}`);
    const aria = node.getAttribute("aria-label") ?? node.getAttribute("alt");
    if (aria) lines.push(`name  ${short(aria, 38)}`);
    if (cs.position === "fixed" || cs.position === "sticky") lines.push(`stays ${cs.position}`);
    for (const l of lines) selBody.appendChild(make("div", "xr-line", l));
  };

  const onPointer = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest(".xr-close")) return;
    select(pick(e.clientX, e.clientY));
  };

  const setHead = () => {
    headWhere.textContent = location.pathname === "/" ? "home" : location.pathname;
    headSize.textContent = `${innerWidth}×${innerHeight}`;
  };

  /* The page changes under it (a route change, a menu opening): redraw after things settle */
  let timer = 0;
  const regather = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { if (!dead) { gather(); setHead(); } }, 350); };
  const mo = new MutationObserver((records) => {
    if (records.every((r) => (r.target as Element).closest?.(".xr-layer"))) return;
    regather();
  });

  const exit = () => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
    mo.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", regather);
    window.removeEventListener("keydown", onKey, true);
    layer.remove();
    onExit();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); exit(); }
  };

  const onScroll = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { if (!dead) gather(); }, 220); };
  layer.addEventListener("pointermove", onPointer);
  layer.addEventListener("pointerdown", onPointer);
  close.addEventListener("click", exit);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", regather);
  window.addEventListener("keydown", onKey, true);
  gather();
  setHead();
  mo.observe(document.body, { childList: true, subtree: true });
  raf = requestAnimationFrame(frame);
  return exit;
}

export default function XRay() {
  useEffect(() => {
    let stop: (() => void) | null = null;
    const toggle = () => {
      if (stop) { stop(); stop = null; }
      else stop = start(() => { stop = null; });
    };
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.code !== "KeyX" || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      toggle();
    };
    const onEvent = () => { if (!stop) toggle(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("zk-xray", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("zk-xray", onEvent);
      stop?.();
    };
  }, []);
  return null;
}
