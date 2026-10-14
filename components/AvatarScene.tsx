"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import Image from "next/image";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* Soft studio reflections, generated locally (no HDR download). */
function Studio() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
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

function AvatarModel() {
  const { scene } = useGLTF("/Avatar.glb");
  const groupRef = useRef<THREE.Group>(null);
  const headBone = useRef<THREE.Object3D | null>(null);
  const headRestRot = useRef({ x: 0, y: 0 });
  const { camera, gl } = useThree();
  const size = useThree((s) => s.size);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const paused = useRef(false);
  const initialized = useRef(false);
  const baseY = useRef(0);
  const nodAt = useRef(-1);
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
    el.setAttribute("data-ready", "1");
  };

  useEffect(() => {
    if (!groupRef.current || initialized.current) return;
    initialized.current = true;

    const SCALE = 3.5;
    groupRef.current.scale.setScalar(SCALE);
    groupRef.current.position.set(0, 0, 0);
    groupRef.current.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const sz = box.getSize(new THREE.Vector3());
    const fullHeight = sz.y;

    const faceMidY = box.max.y - fullHeight * 0.09;
    const chinY    = box.max.y - fullHeight * 0.145;

    // Positive offset = face moves UP on screen
    const VERTICAL_OFFSET = 0.1;
    groupRef.current.position.y = -(faceMidY) + VERTICAL_OFFSET;
    baseY.current = groupRef.current.position.y;
    groupRef.current.updateMatrixWorld(true);

    const worldFaceMid = 0;
    const worldChin    = chinY - faceMidY + VERTICAL_OFFSET;
    const worldTop     = box.max.y - faceMidY + VERTICAL_OFFSET;
    const cutY         = worldChin - 0.18; // neck fades out between chin and here

    camera.position.set(0, worldFaceMid, 3.0);
    camera.lookAt(0, worldFaceMid, 0);
    camera.updateProjectionMatrix();

    // Small buffer so chin doesn't clip on slight downward tilt
    gl.clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -cutY),
    ];
    gl.toneMappingExposure = 0.96;

    metrics.current = { topY: worldTop, chinY: worldChin, cutY };
    publishLayout();

    // Signal the loading screen to dismiss
    window.dispatchEvent(new Event('zk-ready'));

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(upgradeMaterial)
          : upgradeMaterial(obj.material);

        const mb = new THREE.Box3().setFromObject(obj);
        // Hide any mesh whose entire bounding box is below the chin.
        // Head/cap both extend well above worldChin so they're never hidden.
        // Body, arms, and legs all sit below chin → hidden.
        if (mb.max.y < worldChin + 0.05) {
          obj.visible = false;
        }
      }
      const n = obj.name.toLowerCase();
      if (!headBone.current && (n === "head" || n.endsWith("_head") || n.includes("head"))) {
        headBone.current = obj;
        headRestRot.current = { x: obj.rotation.x, y: obj.rotation.y };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, camera, gl]);

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
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-delta * 3.4);
    target.current.x += (mouse.current.x - target.current.x) * k;
    target.current.y += (mouse.current.y - target.current.y) * k;

    const bone = headBone.current ?? groupRef.current;
    if (!bone) return;
    // Cursor follow + a slow idle drift so the head never looks frozen
    const sway = Math.sin(t * 0.55) * 0.045;
    const nod  = Math.sin(t * 0.4 + 1.3) * 0.018;
    bone.rotation.y = headRestRot.current.y + target.current.x * 0.55 + sway; // fuller neck turn left/right
    // Click-to-say-hi: a damped double nod
    let hi = 0;
    if (nodAt.current > 0) {
      const since = (performance.now() - nodAt.current) / 1000;
      if (since < 1.8) hi = Math.sin(since * 12) * Math.exp(-since * 3) * 0.24;
    }
    bone.rotation.x = headRestRot.current.x + target.current.y * 0.10 + nod + hi;  // gentle up/down, chin safe

    // Breathing, depth parallax and a small lean into the turn
    const g = groupRef.current;
    if (g) {
      g.position.y = baseY.current + Math.sin(t * 1.5) * 0.005;
      g.position.x = -target.current.x * 0.035;
      g.rotation.z = -target.current.x * 0.02 + Math.sin(t * 0.45) * 0.008;
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

export default function AvatarScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [bubble, setBubble] = useState("");
  const [shown, setShown] = useState(false);
  const idx = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Decide once: real 3D, or a still photo for visitors who prefer reduced motion
  // or whose device cannot run WebGL (older phones, blocked GPU, privacy modes).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
      webgl = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
    if (!reduce && webgl) {
      useGLTF.preload("/Avatar.glb");
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

  const sayHi = () => {
    window.dispatchEvent(new Event("zk-nod"));
    setBubble(GREETINGS[idx.current % GREETINGS.length]);
    idx.current += 1;
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 2400);
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
          camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 3.0] }}
          gl={{ antialias: true, alpha: true }}
          events={undefined}
          style={{
            width: "100%", height: "100%",
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
          {/* Studio lighting: warm key, cool fill, two rims for edge separation */}
          <hemisphereLight args={["#fff4e8", "#9a8a78", 0.26]} />
          <directionalLight position={[2.6, 4.6, 3]} intensity={2.0} color="#fff0de" />
          <directionalLight position={[-3, 1.4, 2.2]} intensity={0.5} color="#e6eeff" />
          <directionalLight position={[-2.4, 2.6, -3]} intensity={1.3} color="#ffd9bd" />
          <directionalLight position={[3, 2, -2.6]} intensity={0.9} color="#d2e2ff" />
          <Suspense fallback={null}>
            <Studio />
            <AvatarModel />
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

      <button type="button" className="face-hit" aria-label="Say hi to Zaka's avatar" onClick={sayHi}>
        <span className="face-hint" aria-hidden="true">SAY HI</span>
      </button>
      <div className={`face-bubble${shown ? " is-on" : ""}`} role="status" aria-live="polite">{shown ? bubble : ""}</div>
    </div>
  );
}
