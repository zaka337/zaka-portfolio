"use client";

import { useRef, useEffect, useLayoutEffect, useState, Suspense, use } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, PerformanceMonitor } from "@react-three/drei";
import Image from "next/image";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ENV_SIZE, ENV_SIGMA, preloadBakedEnv, bakedEnvTexture } from "@/lib/bakedEnv";
import { mirror } from "@/lib/mirror";
import { found } from "@/lib/secrets";
import { pkt, useAsleep, wake } from "@/lib/sleep";

/* Soft studio reflections, no HDR download. The environment map is pre-baked
   (scripts/bake-env.mjs, public/env/) because building it on the GPU compiles a GGX
   shader that freezes the page for 1-2s on a cold shader cache. A 128px cube is plenty
   for soft light on rough skin and cloth.
   If the baked file is missing, stale (another three revision) or cannot be read, it is
   generated here exactly as before, while the model is still downloading. */
const environments = new WeakMap<THREE.WebGLRenderer, Promise<THREE.Texture | null>>();

function environmentFor(gl: THREE.WebGLRenderer) {
  let env = environments.get(gl);
  if (!env) {
    env = preloadBakedEnv()
      .then((baked) => {
        if (baked) return bakedEnvTexture(baked);
        const pmrem = new THREE.PMREMGenerator(gl);
        const texture = pmrem.fromScene(new RoomEnvironment(), ENV_SIGMA, 0.1, 100, { size: ENV_SIZE }).texture;
        pmrem.dispose();
        return texture;
      })
      .catch(() => null); // no reflections is better than no avatar
    environments.set(gl, env);
  }
  return env;
}

/* Sits in the same Suspense boundary as the model and suspends until the environment
   exists, so both commit together and this layout effect (which runs first, being the
   earlier sibling) sets it before the avatar's shaders are compiled; otherwise they would
   be compiled twice, with and without it. The renderer owns the texture: R3F releases the
   whole GL context when the canvas unmounts. */
function Studio() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = use(environmentFor(gl));
  useLayoutEffect(() => {
    if (!env) return;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
    };
  }, [scene, env]);
  return null;
}

/* three's compile() builds shaders for the renderer's clipping state at that moment, but
   the clipping planes only reach that state through a render. Without this, compileAsync
   links a program with no clipping plane, and the first real frame needs another one with
   the plane in it: linked synchronously, which froze the page for 0.7s+ right as the face
   appeared. One draw-less render of a throwaway mesh makes compile see the plane, so the
   program built in parallel is the one the first frame uses. If a three upgrade changes
   this, the worst case is the old stall (check with a second linkProgram after zk-ready). */
function primeClipping(gl: THREE.WebGLRenderer, camera: THREE.Camera) {
  const probe = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3)),
    new THREE.MeshBasicMaterial(),
  );
  probe.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(probe);
  gl.render(scene, camera);
  probe.geometry.dispose();
  probe.material.dispose();
}

/* The source materials are fully rough (flat, chalky). Rebuild them as physical
   materials so skin, hair and cloth catch light, keeping the original textures. */
function upgradeMaterial(m: THREE.Material): THREE.Material {
  if (!(m instanceof THREE.MeshStandardMaterial)) return m;
  const name = m.name.toLowerCase();
  const skin = name.includes("body");
  const hair = name.includes("hair");
  const p = new THREE.MeshPhysicalMaterial({
    map: m.map,
    normalMap: m.normalMap,
    normalScale: m.normalScale.clone(),
    aoMap: m.aoMap,
    color: m.color.clone(),
    roughness: skin ? 0.58 : hair ? 0.7 : Math.min(m.roughness, 0.82),
    metalness: 0,
    specularIntensity: skin ? 0.5 : 0.4,
    sheen: skin ? 0.35 : hair ? 0.25 : 0,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(skin ? "#ffd2bd" : "#6a5a50"),
    transparent: m.transparent,
    opacity: m.opacity,
    alphaTest: m.alphaTest,
    side: m.side,
  });
  p.name = m.name;
  m.dispose();
  return p;
}

const SCALE = 3.5;
const VERTICAL_OFFSET = 0.1; // positive = face moves UP on screen

type Prepared = {
  baseY: number;
  metrics: { topY: number; chinY: number; cutY: number };
  headBone: THREE.Object3D | null;
  headRest: { x: number; y: number };
};

/* useGLTF caches the glTF scene for the whole session, so it outlives navigation.
   Preparing it (which removes meshes) must happen exactly once. */
const prepared = new WeakMap<THREE.Object3D, Prepared>();

/* Head tricks: the visitor can grab the head, turn it, and flick it into a spin. The pointer
   handlers on the face button (outside the canvas) write this; the model reads it every frame. */
interface Rig {
  dragging: boolean;
  moved: number;                   // pixels dragged since the press: tells a drag from a tap
  yaw: number; yawV: number;       // extra turn left/right (rad) and how fast it is turning
  pitch: number; pitchV: number;   // extra nod up/down
  lastX: number; lastY: number; lastT: number; // previous pointer sample
  spinning: boolean; travel: number; // flicked into a spin; how far it has turned since
  dizzyT: number;                  // seconds since it got dizzy (-1 when it is not)
  talking: boolean;                // the avatar is speaking out loud (components/Voice.tsx)
  asleep: boolean;                 // it is night in Islamabad and nobody has woken him (lib/sleep.ts)
}
const newRig = (): Rig => ({
  dragging: false, moved: 0, yaw: 0, yawV: 0, pitch: 0, pitchV: 0,
  lastX: 0, lastY: 0, lastT: 0, spinning: false, travel: 0, dizzyT: -1, talking: false, asleep: false,
});
const TAU = Math.PI * 2;

/* calm: for visitors who ask their device for reduced motion. The head still turns to
   follow a finger or cursor (they are moving it), but nothing moves on its own: no idle
   sway, breathing or nodding, and the following is gentler. */
function AvatarModel({ calm, rig }: { calm: boolean; rig: React.RefObject<Rig> }) {
  const calmRef = useRef(calm);
  useEffect(() => { calmRef.current = calm; }, [calm]);
  const { scene } = useGLTF("/Avatar.glb");
  const stage = useThree((s) => s.scene);
  const groupRef = useRef<THREE.Group>(null);
  const headBone = useRef<THREE.Object3D | null>(null);
  const headRestRot = useRef({ x: 0, y: 0 });
  const { camera, gl } = useThree();
  const size = useThree((s) => s.size);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const paused = useRef(false);
  const revealed = useRef(false);
  const baseY = useRef(0);
  const nodAt = useRef(-1);
  const sleepW = useRef(0); // 0 awake .. 1 fast asleep, eased
  const metrics = useRef<{ topY: number; chinY: number; cutY: number } | null>(null);

  /* Publish where the head sits on screen so CSS can place the glow, ring and the
     neck fade exactly behind/around it, at any viewport size. */
  const publishLayout = () => {
    const m = metrics.current;
    const el = gl.domElement.closest(".avatar-scene") as HTMLElement | null;
    if (!m || !el) return;
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const pct = (y: number) => ((1 - new THREE.Vector3(0, y, 0).project(camera).y) / 2) * 100;
    const top = pct(m.topY);
    const chin = pct(m.chinY);
    el.style.setProperty("--face-cy", `${((top + chin) / 2).toFixed(2)}%`);
    el.style.setProperty("--face-h", `${(chin - top).toFixed(2)}%`);
    el.style.setProperty("--chin-y", `${chin.toFixed(2)}%`);
    // Head height in px: lets CSS trim the sides relative to the face, not the screen width
    el.style.setProperty("--face-px", `${(((chin - top) / 100) * el.clientHeight).toFixed(1)}px`);
    el.style.setProperty("--cut-y", `${pct(m.cutY).toFixed(2)}%`);
    // The canvas fades in only once the head is actually drawable
    if (revealed.current) el.setAttribute("data-ready", "1");
  };

  /* One-time setup, run before the first frame is drawn:
     - drop everything below the chin (body, arms, legs are never seen) so their
       shaders and textures are never built,
     - build the physical materials up front (not after a first render with the
       originals, which compiled every shader twice),
     - compile the remaining shaders in parallel off the main thread
       (KHR_parallel_shader_compile) and only then reveal the head and release the
       loading screen. Before, compiling blocked the page for several seconds. */
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    let cancelled = false;

    g.scale.setScalar(SCALE);
    g.position.set(0, 0, 0);
    g.updateMatrixWorld(true);

    let prep = prepared.get(scene);
    if (!prep) {
      const box = new THREE.Box3().setFromObject(g);
      const fullHeight = box.getSize(new THREE.Vector3()).y;

      const faceMidY = box.max.y - fullHeight * 0.09;
      const chinY    = box.max.y - fullHeight * 0.145;

      const base = -faceMidY + VERTICAL_OFFSET;
      g.position.y = base;
      g.updateMatrixWorld(true);

      const worldChin = chinY - faceMidY + VERTICAL_OFFSET;
      const worldTop  = box.max.y - faceMidY + VERTICAL_OFFSET;
      const cutY      = worldChin - 0.18; // neck fades out between chin and here

      let bone: THREE.Object3D | null = null;
      let rest = { x: 0, y: 0 };
      const drop: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mb = new THREE.Box3().setFromObject(obj);
          // A mesh whose whole bounding box is below the chin is never visible.
          // Head and cap both extend well above worldChin, so they are kept.
          if (mb.max.y < worldChin + 0.05) {
            drop.push(obj);
          } else {
            obj.material = Array.isArray(obj.material)
              ? obj.material.map(upgradeMaterial)
              : upgradeMaterial(obj.material);
          }
        }
        const n = obj.name.toLowerCase();
        if (!bone && (n === "head" || n.endsWith("_head") || n.includes("head"))) {
          bone = obj;
          rest = { x: obj.rotation.x, y: obj.rotation.y };
        }
      });
      drop.forEach((o) => o.removeFromParent());

      prep = {
        baseY: base,
        metrics: { topY: worldTop, chinY: worldChin, cutY },
        headBone: bone,
        headRest: rest,
      };
      prepared.set(scene, prep);
    } else {
      g.position.y = prep.baseY;
      g.updateMatrixWorld(true);
    }

    baseY.current = prep.baseY;
    metrics.current = prep.metrics;
    headBone.current = prep.headBone;
    headRestRot.current = prep.headRest;

    camera.position.set(0, 0, 3.0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Small buffer so chin doesn't clip on slight downward tilt
    gl.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -prep.metrics.cutY)];
    gl.toneMappingExposure = 0.96;
    primeClipping(gl, camera);

    publishLayout();

    g.visible = false;
    const reveal = () => {
      if (cancelled) return;
      g.visible = true;
      revealed.current = true;
      publishLayout();
      // Signal the loading screen to dismiss
      window.dispatchEvent(new Event("zk-ready"));
    };
    gl.compileAsync(g, camera, stage).then(reveal, reveal);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, camera, gl, stage]);

  // Re-publish after the canvas resizes (R3F updates the camera aspect first)
  useEffect(() => {
    const id = requestAnimationFrame(publishLayout);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      mouse.current.x = (t.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (t.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVisibility = () => { paused.current = document.hidden; };
    const onNod = () => { nodAt.current = performance.now(); };
    window.addEventListener("zk-nod", onNod);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("zk-nod", onNod);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useFrame((state, delta) => {
    if (paused.current) return;
    const calm = calmRef.current;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-delta * (calm ? 2.4 : 3.4));
    target.current.x += (mouse.current.x - target.current.x) * k;
    target.current.y += (mouse.current.y - target.current.y) * k;

    const bone = headBone.current ?? groupRef.current;
    if (!bone) return;
    // Cursor follow + a slow idle drift so the head never looks frozen (not when calm)
    // Night in Islamabad: the head drops, and it stops following the cursor (lib/sleep.ts)
    sleepW.current += ((rig.current.asleep ? 1 : 0) - sleepW.current) * (1 - Math.exp(-Math.min(delta, 0.05) * (calm ? 3 : 1.6)));
    const sw = sleepW.current;
    const awake = 1 - sw * 0.92;
    const sway = calm ? 0 : Math.sin(t * 0.55) * 0.045 * awake;
    const nod  = calm ? 0 : Math.sin(t * 0.4 + 1.3) * 0.018 * awake;
    bone.rotation.y = headRestRot.current.y + target.current.x * (calm ? 0.4 : 0.55) * awake + sway; // fuller neck turn left/right
    // Click-to-say-hi: a damped double nod
    let hi = 0;
    if (!calm && nodAt.current > 0) {
      const since = (performance.now() - nodAt.current) / 1000;
      if (since < 1.8) hi = Math.sin(since * 12) * Math.exp(-since * 3) * 0.24;
    }
    // Head tricks. While it is held the pointer sets the turn; once let go it spins freely
    // (a flick) and then a spring brings it back to the nearest "facing front".
    const rg = rig.current;
    const dt = Math.min(delta, 0.05);
    const stiff = calm ? 40 : 60;  // spring stiffness
    const damp = calm ? 12.6 : 5;  // damping: calm is critical (no overshoot), otherwise it wobbles
    if (!rg.dragging) {
      if (!calm && Math.abs(rg.yawV) > 5) {
        rg.yawV *= Math.exp(-1.15 * dt);
        rg.yaw += rg.yawV * dt;
        rg.travel += Math.abs(rg.yawV) * dt;
      } else {
        const home = Math.round(rg.yaw / TAU) * TAU;
        rg.yawV += (-stiff * (rg.yaw - home) - damp * rg.yawV) * dt;
        rg.yaw += rg.yawV * dt;
        if (rg.spinning) {
          rg.spinning = false;
          if (rg.travel > TAU) { // it turned at least a full circle: now it is dizzy
            rg.dizzyT = 0;
            window.dispatchEvent(new CustomEvent("zk-say", { detail: { text: "WHOA...", ms: 2200 } }));
          }
          rg.travel = 0;
        }
      }
      rg.pitchV += (-stiff * rg.pitch - damp * rg.pitchV) * dt;
      rg.pitch += rg.pitchV * dt;
    }
    let dizzyPitch = 0, dizzyRoll = 0;
    if (rg.dizzyT >= 0) {
      rg.dizzyT += dt;
      const fade = Math.exp(-rg.dizzyT / 1.1);
      dizzyPitch = Math.sin(rg.dizzyT * 9) * 0.14 * fade;
      dizzyRoll = Math.sin(rg.dizzyT * 6.5 + 1) * 0.1 * fade;
      if (rg.dizzyT > 3) rg.dizzyT = -1;
    }
    // Speaking out loud: the head bobs and sways a little as people do when they talk (not when calm)
    const talkSway = rg.talking && !calm ? Math.sin(t * 3.1) * 0.05 : 0;
    const talkBob = rg.talking && !calm ? Math.sin(t * 11) * 0.028 + Math.sin(t * 5.3) * 0.02 : 0;
    bone.rotation.y += rg.yaw + talkSway;
    const slump = sw * (0.5 + (calm ? 0 : Math.sin(t * 0.9) * 0.022)); // chin to chest, breathing slowly
    bone.rotation.x = headRestRot.current.x + target.current.y * 0.10 * awake + nod + hi + rg.pitch + dizzyPitch + talkBob + slump;  // gentle up/down, chin safe

    // Breathing, depth parallax and a small lean into the turn
    const g = groupRef.current;
    if (g) {
      g.position.y = baseY.current + (calm ? 0 : Math.sin(t * 1.5) * 0.005) - sw * 0.012;
      g.position.x = -target.current.x * (calm ? 0.02 : 0.035) * awake;
      g.rotation.z = -target.current.x * (calm ? 0.01 : 0.02) * awake + (calm ? 0 : Math.sin(t * 0.45) * 0.008) + dizzyRoll + sw * 0.07;
    }

    // Look back: while the camera is mirroring the visitor, the head glides over to copy their head
    // (turn, nod, tilt) and glides back when it stops. Copying a person is their own movement, so
    // it is allowed in calm mode too.
    mirror.weight += ((mirror.on ? 1 : 0) - mirror.weight) * (1 - Math.exp(-delta * 7));
    if (mirror.weight > 0.002) {
      const w = mirror.weight;
      bone.rotation.y += (headRestRot.current.y + mirror.yaw - bone.rotation.y) * w;
      bone.rotation.x += (headRestRot.current.x + mirror.pitch - bone.rotation.x) * w;
      const gz = groupRef.current;
      if (gz) gz.rotation.z += (mirror.roll - gz.rotation.z) * w;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

const GREETINGS = ["HEY THERE!", "HI, I'M ZAKA", "NICE TO MEET YOU", "LET'S BUILD SOMETHING"];

type Mode = "pending" | "3d" | "still";

/* Where the head sits on screen in the standard framing (same numbers the 3D scene
   publishes), so the glow, hit area and neck line up with the still image too. */
const STILL_LAYOUT = { cy: 41.32, h: 38.58, chin: 60.61, cut: 67.85 };

/* Pixel budget for the canvas. A full-viewport canvas on a 4K or retina screen has
   millions of pixels to fill every frame, which is what makes 120Hz hard to hold.
   Start at a sensible ratio for the screen, then let PerformanceMonitor step it down
   (or back up) from real frame times. */
const MAX_CANVAS_PIXELS = 4_500_000;
const MIN_DPR = 1;

/* The canvas is a centred column, not the full viewport: a CSS mask already hides
   everything outside roughly 0.65x the viewport height around the head, so drawing,
   anti-aliasing and masking the rest was wasted work every frame (about half of all
   pixels on a desktop screen). 0.82 leaves margin for the head turning. Phones are
   narrower than this and keep their full width. */
const CANVAS_WIDTH = "min(100vw, 82dvh)";

function startingDpr() {
  const device = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.min(window.innerWidth, 0.82 * window.innerHeight);
  const fit = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, w * window.innerHeight));
  return Math.max(MIN_DPR, +Math.min(device, fit).toFixed(2));
}

export default function AvatarScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [bubble, setBubble] = useState("");
  const [shown, setShown] = useState(false);
  // The ratio the screen starts at is also its ceiling: PerformanceMonitor only steps
  // below it and back up to it.
  const [maxDpr] = useState(startingDpr);
  const [dpr, setDpr] = useState(maxDpr);
  const idx = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Other parts of the page can make the avatar say something (e.g. the title that falls apart).
  useEffect(() => {
    const onSay = (e: Event) => {
      const d = (e as CustomEvent<{ text?: string; ms?: number }>).detail;
      if (!d?.text) return;
      setBubble(d.text);
      setShown(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShown(false), d.ms ?? 2400);
    };
    window.addEventListener("zk-say", onSay);
    return () => window.removeEventListener("zk-say", onSay);
  }, []);

  // Reduced motion keeps the 3D head but makes it calm (see AvatarModel). Follows the
  // device setting if it is changed while the page is open.
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Decide once: real 3D, or a still photo for devices that cannot run WebGL
  // (older phones, blocked GPU, privacy modes).
  useEffect(() => {
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
      webgl = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
    if (webgl) {
      useGLTF.preload("/Avatar.glb");
      preloadBakedEnv(); // fetched in parallel with the model
      setMode("3d");
    } else {
      setMode("still");
    }
  }, []);

  // Still mode has no 3D scene to publish the layout, so publish it here and
  // release the loading screen.
  useEffect(() => {
    if (mode !== "still") return;
    const el = wrapRef.current;
    if (!el) return;
    el.style.setProperty("--face-cy", `${STILL_LAYOUT.cy}%`);
    el.style.setProperty("--face-h", `${STILL_LAYOUT.h}%`);
    el.style.setProperty("--chin-y", `${STILL_LAYOUT.chin}%`);
    el.style.setProperty("--cut-y", `${STILL_LAYOUT.cut}%`);
    el.style.setProperty("--face-px", `${((STILL_LAYOUT.h / 100) * el.clientHeight).toFixed(1)}px`);
    el.setAttribute("data-ready", "1");
    window.dispatchEvent(new Event("zk-ready"));
  }, [mode]);

  const asleep = useAsleep(); // night in Islamabad: the head drops (lib/sleep.ts)
  const sayHi = () => {
    if (asleep) {
      // Poking a sleeper: he wakes, grumpy, and stays awake for the rest of the visit
      wake();
      setBubble("...5 MORE MINUTES.");
      setShown(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShown(false), 2800);
      return;
    }
    window.dispatchEvent(new Event("zk-nod"));
    setBubble(GREETINGS[idx.current % GREETINGS.length]);
    idx.current += 1;
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 2400);
  };

  /* Head tricks: press and drag the face to turn the head, let go to watch it spring back,
     flick it hard to send it spinning. A press that barely moves is still "say hi". */
  const rig = useRef<Rig>(newRig());
  const press = useRef(0); // the long-press timer
  useEffect(() => () => window.clearTimeout(press.current), []);
  useEffect(() => { rig.current.asleep = asleep; }, [asleep]);
  // While he sleeps: a little ZZZ now and then, and the time it is there (the phone has no status line)
  useEffect(() => {
    if (!asleep) return;
    let n = 0;
    const say = () => {
      const lines = ["ZZZ...", `SHH. IT IS ${pkt().text} HERE.`, "ZZZ..."];
      window.dispatchEvent(new CustomEvent("zk-say", { detail: { text: lines[n++ % lines.length], ms: 2600 } }));
    };
    const first = window.setTimeout(say, 1800);
    const id = window.setInterval(say, 7000);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [asleep]);
  // components/Voice.tsx tells the avatar when it starts and stops speaking
  useEffect(() => {
    const onTalking = (e: Event) => { rig.current.talking = !!(e as CustomEvent<boolean>).detail; };
    window.addEventListener("zk-talking", onTalking);
    return () => window.removeEventListener("zk-talking", onTalking);
  }, []);
  const onGrab = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const r = rig.current;
    r.dragging = true;
    r.moved = 0;
    // Held still for a moment: the secret terminal (components/Terminal.tsx)
    window.clearTimeout(press.current);
    press.current = window.setTimeout(() => {
      if (!rig.current.dragging || rig.current.moved >= 8) return;
      rig.current.moved = 999; // and this press is no longer a tap
      navigator.vibrate?.(18);
      window.dispatchEvent(new Event("zk-terminal"));
    }, 650);
    r.lastX = e.clientX; r.lastY = e.clientY; r.lastT = performance.now();
    r.yawV = 0; r.pitchV = 0; r.spinning = false; r.dizzyT = -1; // grabbing it stops everything
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the window still gets the moves */ }
  };
  const onDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = rig.current;
    if (!r.dragging) return;
    const now = performance.now();
    const dx = e.clientX - r.lastX;
    const dy = e.clientY - r.lastY;
    const ms = Math.max(4, now - r.lastT);
    r.yaw += dx * 0.011;
    r.pitch = Math.max(-0.5, Math.min(0.5, r.pitch + dy * 0.006));
    r.yawV = r.yawV * 0.55 + ((dx * 0.011) / (ms / 1000)) * 0.45; // how fast the hand is turning it
    r.moved += Math.abs(dx) + Math.abs(dy);
    if (r.moved > 8) { found("head"); if (r.asleep) wake(); } // really dragged it, not just tapped
    r.lastX = e.clientX; r.lastY = e.clientY; r.lastT = now;
  };
  const onLetGo = () => {
    window.clearTimeout(press.current);
    const r = rig.current;
    if (!r.dragging) return;
    r.dragging = false;
    if (performance.now() - r.lastT > 90) r.yawV = 0;            // held still before letting go: no throw
    r.yawV = Math.max(-45, Math.min(45, r.yawV));
    r.travel = 0;
    if (calm) r.yawV = 0;                                        // calm: it just eases back
    else if (Math.abs(r.yawV) > 8) r.spinning = true;
  };

  return (
    <div
      ref={wrapRef}
      className="avatar-scene"
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100dvh",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
        backgroundColor: "transparent",
      }}
    >
      {mode === "3d" && (
        <Canvas
          dpr={dpr}
          camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 3.0] }}
          // Edges are already crisp at 2x, where 4x multisampling a full-screen buffer
          // is mostly wasted bandwidth. Low-density screens keep it.
          gl={{ antialias: maxDpr < 1.5, alpha: true, powerPreference: "high-performance" }}
          events={undefined}
          style={{
            width: CANVAS_WIDTH, height: "100%",
            margin: "0 auto",
            display: "block",
            background: "transparent",
            pointerEvents: "none",
          }}
          onCreated={({ gl, scene: s }) => {
            gl.setClearColor(0x000000, 0);
            s.background = null;
            // If the GPU context is lost later, fall back to the still photo.
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setMode("still");
            });
          }}
        >
          {/* Watches real frame times. Below the target it renders fewer pixels, with
              headroom it steps back up. 120Hz screens are held to a higher bar. */}
          <PerformanceMonitor
            bounds={(refreshRate) => (refreshRate > 90 ? [85, 110] : [50, 58])}
            onDecline={() => setDpr((d) => Math.max(MIN_DPR, +(d - 0.25).toFixed(2)))}
            onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
          />
          {/* Studio lighting: warm key, cool fill, two rims for edge separation */}
          <hemisphereLight args={["#fff4e8", "#9a8a78", 0.26]} />
          <directionalLight position={[2.6, 4.6, 3]} intensity={2.0} color="#fff0de" />
          <directionalLight position={[-3, 1.4, 2.2]} intensity={0.5} color="#e6eeff" />
          <directionalLight position={[-2.4, 2.6, -3]} intensity={1.3} color="#ffd9bd" />
          <directionalLight position={[3, 2, -2.6]} intensity={0.9} color="#d2e2ff" />
          <Suspense fallback={null}>
            <Studio />
            <AvatarModel calm={calm} rig={rig} />
          </Suspense>
        </Canvas>
      )}

      {mode === "still" && (
        <Image
          className="face-still"
          src="/face-still.webp"
          alt="Zaka Ullah Waheed's avatar"
          width={760}
          height={800}
          priority
          draggable={false}
          sizes="(max-width: 768px) 70vw, 40vw"
        />
      )}

      <button
        type="button"
        className="face-hit"
        aria-label="Say hi to Zaka's avatar"
        onClick={() => {
          if (rig.current.moved > 8) { rig.current.moved = 0; return; } // that was a drag, not a tap
          sayHi();
        }}
        onPointerDown={onGrab}
        onPointerMove={onDrag}
        onPointerUp={onLetGo}
        onPointerCancel={onLetGo}
      >
        <span className="face-hint" aria-hidden="true">SAY HI</span>
      </button>
      <div className={`face-bubble${shown ? " is-on" : ""}`} role="status" aria-live="polite">{shown ? bubble : ""}</div>
    </div>
  );
}
