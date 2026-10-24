/* The portfolio's service worker. It is a TEMPLATE: scripts/make-sw.mjs runs after every build, fills in
   the version and the list of files, and writes the result to public/sw.js (which is not committed).

   What it does
   - On the first visit it saves a full copy of the site on the device (every page, all the code, the
     3D head, the images, the resume): about 5 MB. That is what lets the site open with no connection and
     lets it be installed as an app.
   - Pages: the network first, so a visitor always gets the newest deploy; if the network is down (or
     takes more than a few seconds and a saved copy exists) the saved copy is shown instead; a page that
     was never saved gets /offline.
   - Code and images: saved copies first (the code files have a hash in their name, so they never change).
   - Never touched: other sites, anything that is not a GET, the API, analytics, the WhatsApp redirect,
     and Next.js's own data requests (if those fail, Next.js simply loads the page the normal way, which
     comes back here and is answered from the saved copy).
   - A new deploy means a new version: the new copy is saved next to the old one, the old one is deleted
     on activation, and files that never change are reused instead of downloaded again.

   Kill switch: build with PWA_DISABLE=1 and this file becomes a worker that deletes every saved copy and
   removes itself from every visitor's browser the next time they open the site. */

"use strict";

const VERSION = "__VERSION__";
const PRE = "zk-pre-" + VERSION;       // saved at install; replaced by each new version
const RUN = "zk-run-v1";               // saved while browsing: pages visited, images, the camera engine
const PAGES = __PAGES__;
const ASSETS = __ASSETS__;
const CORE = ["/", "/offline"];        // if these cannot be saved the install fails and is tried again later
const SLOW_MS = 4500;                  // a saved page is shown instead of waiting longer than this
const MAX_IMAGES = 160;

const NEVER = [/^\/api\//, /^\/_vercel\//, /^\/whatsapp/, /^\/sw\.js$/];
const IMMUTABLE = /^\/(_next\/static\/|Avatar\.glb$|mobile\.jpg$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

async function precache() {
  const cache = await caches.open(PRE);
  const queue = [...PAGES.map((u) => [u, true]), ...ASSETS.map((u) => [u, false])];
  let failed = 0;
  async function save([url, fresh]) {
    try {
      if (!fresh && IMMUTABLE.test(url.split("?")[0])) {
        const old = await caches.match(url, { ignoreVary: true });      // never changes: reuse the copy from the last version
        if (old) { await cache.put(url, old); return; }
      }
      const res = await fetch(url, fresh ? { cache: "reload" } : undefined);
      if (!res.ok) throw new Error("HTTP " + res.status);
      await cache.put(url, res);
    } catch (err) {
      failed++;
      if (CORE.includes(url)) throw err;
    }
  }
  await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await save(queue.shift()); }));
  self.__failed = failed;
  await self.skipWaiting();
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("zk-pre-") && key !== PRE) await caches.delete(key);
    await self.clients.claim();
    await tell(null);
  })());
});

async function status() {
  const saved = (await (await caches.open(PRE)).keys()).length;
  return { type: "zk-sw", state: "ready", version: VERSION, saved, total: PAGES.length + ASSETS.length };
}
async function tell(target) {
  const msg = await status();
  if (target) { target.postMessage(msg); return; }
  for (const c of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) c.postMessage(msg);
}
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "zk-sw-status" && event.source) event.waitUntil(tell(event.source));
});

// ── looking things up ──
async function lookup(request) {
  for (const name of [RUN, PRE]) {
    const cache = await caches.open(name);
    const hit = await cache.match(request, { ignoreVary: true });
    if (hit) return { hit, cache };
  }
  return null;
}
async function remember(request, response, name) {
  try { await (await caches.open(name || RUN)).put(request, response); } catch { /* storage full: the site still works */ }
}
async function trimImages() {
  const cache = await caches.open(RUN);
  const keys = (await cache.keys()).filter((r) => r.url.includes("/_next/image"));
  for (const r of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await cache.delete(r);
}

// pages are saved under their path only, so "/?source=app" and "/?test" use the copy of "/"
function pageKey(url) {
  const p = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return new Request(p);
}
async function savedPage(url) {
  const found = await lookup(pageKey(url));
  return found ? found.hit : null;
}
async function offlinePage() {
  const found = await lookup(new Request("/offline"));
  if (found) return found.hit;
  return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Offline</title><body style='font:600 18px Helvetica,Arial,sans-serif;background:#f1ede2;color:#0d0d0d;padding:12vw'>You are offline, and that page is not saved yet. <a href='/'>Home</a>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
function isPage(res) {
  return res && res.ok && res.status === 200 && !res.redirected && (res.headers.get("content-type") || "").includes("text/html");
}

async function pageRequest(event) {
  const request = event.request, url = new URL(request.url);
  if (self.navigator && self.navigator.onLine === false) return (await savedPage(url)) || (await offlinePage());
  const net = fetch(request);
  const slow = new Promise((resolve) => setTimeout(async () => { const s = await savedPage(url); if (s) resolve(s); }, SLOW_MS));
  event.waitUntil(net.then((res) => { if (isPage(res)) return remember(pageKey(url), res.clone()); }).catch(() => {}));
  try {
    return await Promise.race([net, slow]);
  } catch {
    return (await savedPage(url)) || (await offlinePage());
  }
}

async function cacheFirst(event, name) {
  const found = await lookup(event.request);
  if (found) return found.hit;
  const res = await fetch(event.request);
  if (res.ok) event.waitUntil(remember(event.request, res.clone(), name));
  return res;
}

async function staleWhileRevalidate(event) {
  const found = await lookup(event.request);
  const net = fetch(event.request).then((res) => {
    if (res.ok) event.waitUntil(remember(event.request, res.clone()).then(() => (event.request.url.includes("/_next/image") ? trimImages() : null)));
    return res;
  }).catch(() => null);
  if (found) { event.waitUntil(net); return found.hit; }
  return (await net) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((r) => r.test(url.pathname))) return;
  if (request.headers.has("range")) return;                                              // video-style partial requests
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch") || url.searchParams.has("_rsc")) return;   // Next.js data: network only

  if (request.mode === "navigate") { event.respondWith(pageRequest(event)); return; }
  const p = url.pathname;
  if (IMMUTABLE.test(p) || p.startsWith("/mediapipe/")) { event.respondWith(cacheFirst(event, p.startsWith("/mediapipe/") ? RUN : PRE)); return; }
  event.respondWith(staleWhileRevalidate(event));
});
