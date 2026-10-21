"use client";

import dynamic from "next/dynamic";
import LoaderCleanup from "@/components/LoaderCleanup";

const CustomCursor = dynamic(() => import("@/components/CustomCursor"), { ssr: false });
// A secret command line (` key, or long-press the face on a phone). Loaded after the page.
const Terminal = dynamic(() => import("@/components/Terminal"), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoaderCleanup />
      <CustomCursor />
      <Terminal />
      {children}
    </>
  );
}
