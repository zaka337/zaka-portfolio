/* One way to go to another page from code (the search panel, and anything else that wants the
   page-change animation). The animation component (components/Transition.tsx) listens for
   `zk-go`; if nothing handles it, the page simply changes the normal way. */

export function navigate(router: { push: (href: string) => void }, href: string) {
  const ev = new CustomEvent("zk-go", { detail: { href }, cancelable: true });
  window.dispatchEvent(ev);
  if (!ev.defaultPrevented) router.push(href);
}
