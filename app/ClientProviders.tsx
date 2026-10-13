"use client";

import dynamic from "next/dynamic";
import LoaderCleanup from "@/components/LoaderCleanup";

const CustomCursor = dynamic(() => import("@/components/CustomCursor"), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoaderCleanup />
      <CustomCursor />
      {children}
    </>
  );
}
