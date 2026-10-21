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

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoaderCleanup />
      <CustomCursor />
      <Terminal />
      <XRay />
      <Voice />
      <LookBack />
      {children}
    </>
  );
}
