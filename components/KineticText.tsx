import "./kinetic.css";

/* A line of big type whose letters can move one by one. Each of the four doors on the home page
   has its own effect (kinetic.css): SAY HI waves, MORE ABOUT ME types itself out, MY PROJECTS
   flips like the cards of a carousel, CONTACT ME rings like a phone. The letters arrive one after
   another when the page opens, and play the effect again whenever the door is hovered, focused or
   pressed. The effects are CSS only, so nothing runs in the meantime.

   The link around the letters carries the spoken label (aria-label), which replaces its content for
   screen readers. The letters are not marked aria-hidden on purpose: the page crumble in the secret
   terminal (lib/knockOver.ts) skips anything aria-hidden, and these should fall with the rest.
   `start` continues the count from the line above, so the stagger runs through both lines. */

export type KineticFx = "wave" | "type" | "flip" | "ring";

export default function KineticText({ text, fx, start = 0, delay = 0 }: { text: string; fx: KineticFx; start?: number; delay?: number }) {
  return (
    <span className={`kt kt-${fx}`} style={{ ["--d" as string]: `${delay}ms` } as React.CSSProperties}>
      {text.split("").map((ch, i) => (
        <span key={i} className="kt-ch" style={{ ["--i" as string]: start + i } as React.CSSProperties}>
          <i>{ch === " " ? " " : ch}</i>
        </span>
      ))}
    </span>
  );
}
