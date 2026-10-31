/* A black note at the bottom of the screen, only when the address has ?debug (the page that draws it is the
   small script in DEBUG_SCRIPT below, which the layout puts in <head> before anything else runs).
   Why it exists: on a phone there is no console, so a failure there can only be read from a screenshot.
   It is plain DOM on purpose, and it starts before React, so it still works when React is what broke. */

declare global {
  interface Window { __zkDebug?: (line: string) => void }
}

/** Add a line to the note (does nothing without ?debug). */
export function debugNote(line: string) {
  try { window.__zkDebug?.(line); } catch { /* nothing to show it with */ }
}

// Written in old, plain JavaScript on purpose: it has to run on any phone, before the site's own code.
export const DEBUG_SCRIPT = [
  "try{if(/[?&]debug(&|$)/.test(location.search)){",
  "var box=null,q=[];",
  "var draw=function(){try{if(!document.body)return;",
  "if(!box||!box.parentNode){box=document.createElement('div');box.id='zk-debug';",
  "box.setAttribute('style','position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483000;max-height:45vh;overflow:auto;margin:0;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.88);color:#fff;font:12px/1.4 monospace;word-break:break-word;white-space:pre-wrap');",
  "document.body.appendChild(box)}",
  "while(q.length)box.appendChild(document.createTextNode(q.shift()+'\\n'))}catch(e){}};",
  "var show=function(s){q.push(s);draw()};",
  "window.__zkDebug=show;",
  "document.addEventListener('DOMContentLoaded',function(){draw();probe()});",
  "window.addEventListener('error',function(e){var t=e.target;",
  "if(t&&t!==window&&t.tagName)show('load failed: <'+t.tagName.toLowerCase()+'> '+String(t.src||t.href||'').split('/').slice(-2).join('/'));",
  "else show('error: '+e.message+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')')},true);",
  "window.addEventListener('unhandledrejection',function(e){var r=e.reason;show('promise: '+String(r&&r.message||r).slice(0,200))});",
  "var gl=function(kind){try{var c=document.createElement('canvas'),g=c.getContext(kind);",
  "if(g){var x=g.getExtension('WEBGL_lose_context');if(x)x.loseContext()}return g?'yes':'NO'}catch(e){return 'error'}};",
  "var probe=function(){var r=[],m=/OS (\\d+)[_.](\\d+)/.exec(navigator.userAgent);",
  "r.push('iOS '+(m?m[1]+'.'+m[2]:'?'));r.push('webgl2 '+gl('webgl2'));r.push('webgl1 '+gl('webgl'));",
  "r.push('wasm '+(typeof WebAssembly==='object'?'yes':'NO'));r.push('sw '+('serviceWorker' in navigator?'yes':'no'));",
  "r.push('dpr '+window.devicePixelRatio);r.push(screen.width+'x'+screen.height);",
  "show('debug on | '+r.join(' | ')+'\\n'+navigator.userAgent)}",
  "}}catch(e){}",
].join("");
