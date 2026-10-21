import type { Metadata } from "next";
import ScrollUnlock from "@/components/ScrollUnlock";
import Backstage from "@/components/Backstage";

// Not for search engines: it is the reward for the hidden things, not part of the site's pages
export const metadata: Metadata = {
  title: "Backstage",
  robots: { index: false, follow: false },
};

export default function BackstagePage() {
  return (
    <>
      <ScrollUnlock />
      <Backstage />
    </>
  );
}
