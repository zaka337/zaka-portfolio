"use client";

import { Component, type ReactNode } from "react";

/* A safety net for the 3D head. Without it, one thing going wrong in the 3D part (the model or its decoder not
   loading, a phone that cannot run it, a chunk that never arrives) throws out of React and takes the WHOLE page
   down with the framework's bare "This page couldn't load". With it, only the 3D part is dropped: `onFail` is told why
   (AvatarScene then shows the still photo instead) and everything else on the page keeps working.
   Used twice: around the Canvas inside AvatarScene (3D failures) and around AvatarScene itself in HomeScreen
   (the scene's own code failing to load or run). */
export default class SceneGuard extends Component<{ children: ReactNode; onFail?: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[3D scene failed]", error);
    try { this.props.onFail?.(error); } catch { /* the page must survive this too */ }
    // The loading screen waits for the head: let it go
    try { window.dispatchEvent(new Event("zk-ready")); } catch { /* nothing to tell */ }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
