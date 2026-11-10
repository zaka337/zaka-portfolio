"use client";

import dynamic from "next/dynamic";
import Guard from "@/components/Guard";

/* The build is loaded after the page, like the site's other extras, and sits in its own Guard: if its code cannot load or
   throws on some phone, only the build is left out and the home carries on. */
const HomeBuild = dynamic(() => import("./HomeBuild"), { ssr: false });

export default function HomeBuildLoader() {
  return <Guard name="HomeBuild"><HomeBuild /></Guard>;
}
