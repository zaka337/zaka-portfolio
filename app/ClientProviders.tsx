"use client";

import dynamic from "next/dynamic";
import LoaderCleanup from "@/components/LoaderCleanup";

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

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoaderCleanup />
      <CustomCursor />
      <Terminal />
      <XRay />
      <Voice />
      <LookBack />
      <SecretToast />
      <Lamp />
      <Tour />
      <Sound />
      <Receipt />
      <BugHunt />
      <PaperPlane />
      {children}
    </>
  );
}
