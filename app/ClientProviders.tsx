"use client";

import dynamic from "next/dynamic";
import LoaderCleanup from "@/components/LoaderCleanup";
import Guard from "@/components/Guard";

const CustomCursor = dynamic(() => import("@/components/CustomCursor"), { ssr: false });
// A secret command line (` key, or long-press the face on a phone). Loaded after the page.
const Terminal = dynamic(() => import("@/components/Terminal"), { ssr: false });
// Shift+X: the page redrawn as a blueprint. Also loaded after the page.
const XRay = dynamic(() => import("@/components/XRay"), { ssr: false });
// Talk to the avatar out loud (`talk` in the terminal, or Shift+V). Also loaded after the page.
const Voice = dynamic(() => import("@/components/Voice"), { ssr: false });
// The avatar copies your head through the camera (`camera` in the terminal, or Shift+C). The face
// tracker itself is only downloaded when someone turns it on.
const LookBack = dynamic(() => import("@/components/LookBack"), { ssr: false });
// The note that appears when a visitor finds a hidden thing (lib/secrets.ts)
const SecretToast = dynamic(() => import("@/components/SecretToast"), { ssr: false });
// Dark paper lit by a lamp that follows the pointer (`lamp` in the terminal, or hold the theme button)
const Lamp = dynamic(() => import("@/components/Lamp"), { ssr: false });
// A one minute walk around the site (`tour` in the terminal, or ask the avatar for a tour)
const Tour = dynamic(() => import("@/components/Tour"), { ssr: false });
// Tiny made-up sounds, off until asked (`sound` in the terminal)
const Sound = dynamic(() => import("@/components/Sound"), { ssr: false });
// `print` in the terminal: the resume as a till receipt
const Receipt = dynamic(() => import("@/components/Receipt"), { ssr: false });
// A small ink bug wanders across seven of the pages; squash it
const BugHunt = dynamic(() => import("@/components/BugHunt"), { ssr: false });
// A paper plane flies off when the project brief is sent
const PaperPlane = dynamic(() => import("@/components/PaperPlane"), { ssr: false });
// The "Aa" button: bigger text, easy-read font, contrast, calm mode, read the page aloud
const Access = dynamic(() => import("@/components/Access"), { ssr: false });

// The installable, offline version of the site: registers the service worker, offers "install as an app",
// and shows an offline bar. Does nothing in development.
const PwaProvider = dynamic(() => import("@/components/PwaProvider"), { ssr: false });

// Ctrl+K (or /): search the whole site from the keyboard
const Palette = dynamic(() => import("@/components/Palette"), { ssr: false });

// Hold D and move the mouse: the full stop draws in ink, and the ink fades
const Doodle = dynamic(() => import("@/components/Doodle"), { ssr: false });

// A paper curtain with the next page's name on it covers each page change (not with Reduce Motion)
const Transition = dynamic(() => import("@/components/Transition"), { ssr: false });

// "Get drawn": the five cursors draw the visitor's portrait in ink. Only a tiny listener is loaded up front; the sheet and the
// face tracker come the first time someone asks (terminal `portrait`, Ctrl+K, or /?portrait).
const PortraitLoader = dynamic(() => import("@/components/portrait/PortraitLoader"), { ssr: false });

// Every extra sits in its own Guard: if one cannot load or throws on some phone, only that one is left out and the
// page itself carries on (see components/Guard.tsx).
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoaderCleanup />
      <Guard name="Cursor"><CustomCursor /></Guard>
      <Guard name="Terminal"><Terminal /></Guard>
      <Guard name="XRay"><XRay /></Guard>
      <Guard name="Voice"><Voice /></Guard>
      <Guard name="LookBack"><LookBack /></Guard>
      <Guard name="SecretToast"><SecretToast /></Guard>
      <Guard name="Lamp"><Lamp /></Guard>
      <Guard name="Tour"><Tour /></Guard>
      <Guard name="Sound"><Sound /></Guard>
      <Guard name="Receipt"><Receipt /></Guard>
      <Guard name="BugHunt"><BugHunt /></Guard>
      <Guard name="PaperPlane"><PaperPlane /></Guard>
      <Guard name="Access"><Access /></Guard>
      <Guard name="Palette"><Palette /></Guard>
      <Guard name="Doodle"><Doodle /></Guard>
      <Guard name="Portrait"><PortraitLoader /></Guard>
      <Guard name="Transition"><Transition /></Guard>
      <Guard name="Pwa"><PwaProvider /></Guard>
      {children}
    </>
  );
}
