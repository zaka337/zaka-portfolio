import { clamp } from "./util";
import type { Input } from "./vehicle";

/* One input for the whole game. The keyboard and the on-screen touch buttons both write into
   it, and the player's car reads a single `Input` from it every step. Anything that could leave
   a control stuck (the window losing focus, a touch being cancelled, the tab being hidden)
   releases everything. */

export type Control = "left" | "right" | "gas" | "brake" | "hand";

const KEYS: Record<string, Control> = {
  KeyW: "gas", ArrowUp: "gas", KeyS: "brake", ArrowDown: "brake", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right", Space: "hand",
};

export class Controls {
  private keys = new Set<Control>();
  private touch = new Map<Control, Set<number>>();   // which pointers are holding which button
  private active = false;
  onPause?: () => void;
  onRestart?: () => void;
  onConfirm?: () => void;

  private down = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const c = KEYS[e.code];
    if (c) {
      if (this.active) e.preventDefault();
      this.keys.add(c);
      return;
    }
    if (e.code === "Escape" && !e.repeat) this.onPause?.();
    else if (e.code === "KeyR" && !e.repeat) this.onRestart?.();
    else if ((e.code === "Enter" || e.code === "Space") && !e.repeat) this.onConfirm?.();
  };
  private up = (e: KeyboardEvent) => {
    const c = KEYS[e.code];
    if (c) { this.keys.delete(c); if (this.active) e.preventDefault(); }
  };
  private blur = () => this.releaseAll();
  private vis = () => { if (document.hidden) this.releaseAll(); };

  attach() {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.vis);
  }
  detach() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.vis);
    this.releaseAll();
  }
  /** While true, the driving keys (and the space bar) are kept from scrolling the page */
  setActive(on: boolean) { this.active = on; }

  press(c: Control, pointer: number) {
    let s = this.touch.get(c);
    if (!s) { s = new Set(); this.touch.set(c, s); }
    s.add(pointer);
  }
  release(c: Control, pointer: number) { this.touch.get(c)?.delete(pointer); }
  releaseAll() { this.keys.clear(); this.touch.clear(); }

  private held(c: Control) { return this.keys.has(c) || (this.touch.get(c)?.size ?? 0) > 0; }
  isHeld(c: Control) { return this.held(c); }

  read(out: Input): Input {
    out.throttle = this.held("gas") ? 1 : 0;
    out.brake = this.held("brake") ? 1 : 0;
    out.steer = clamp((this.held("right") ? 1 : 0) - (this.held("left") ? 1 : 0), -1, 1);
    out.handbrake = this.held("hand");
    return out;
  }
}
