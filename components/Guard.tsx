"use client";

import { Component, type ReactNode } from "react";
import { debugNote } from "@/lib/debugNote";

/* A safety net for one optional extra of the site (the cursor, the terminal, the voice, the camera, the lamp...).
   Each of them is loaded as its own piece of code after the page. If one cannot load, or throws while it starts, on some
   phone, only that extra is left out; without this the error climbs out of React and the whole page shows the
   framework's "This page couldn't load". With ?debug in the address the reason is written on the screen. */
export default class Guard extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.name} failed]`, error);
    debugNote(`${this.props.name} failed: ${String(error?.message ?? error).slice(0, 220)}`);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
