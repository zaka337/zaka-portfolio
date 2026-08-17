"use client";

import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function AvatarModel() {
  const { scene } = useGLTF("/Avatar.glb");
  const groupRef = useRef<THREE.Group>(null);
  const headBone    = useRef<THREE.Object3D | null>(null);
  const headRestRot = useRef({ x: 0, y: 0 });
  const { camera, gl } = useThree();
  const mouse  = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  useEffect(() => {
    if (!groupRef.current || initialized.current) return;
    initialized.current = true;

    const SCALE = 3.5;
    groupRef.current.scale.setScalar(SCALE);
    groupRef.current.position.set(0, 0, 0);
    groupRef.current.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = box.getSize(new THREE.Vector3());
    const fullHeight = size.y;

    const faceMidY = box.max.y - fullHeight * 0.09;
    const chinY    = box.max.y - fullHeight * 0.145;

    // Positive offset = face moves UP on screen
    const VERTICAL_OFFSET = 0.1;
    groupRef.current.position.y = -(faceMidY) + VERTICAL_OFFSET;
    groupRef.current.updateMatrixWorld(true);

    const worldFaceMid = 0;
    const worldChin    = chinY - faceMidY + VERTICAL_OFFSET;

    camera.position.set(0, worldFaceMid, 3.0);
    camera.lookAt(0, worldFaceMid, 0);
    camera.updateProjectionMatrix();

    // Small buffer so chin doesn't clip on slight downward tilt
    gl.clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -(worldChin - 0.08)),
    ];

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
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
  }, [scene, camera, gl]);

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
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useFrame(() => {
    target.current.x += (mouse.current.x - target.current.x) * 0.05;
    target.current.y += (mouse.current.y - target.current.y) * 0.05;

    const bone = headBone.current ?? groupRef.current;
    if (!bone) return;
    bone.rotation.y = headRestRot.current.y + target.current.x * 0.55; // fuller neck turn left/right
    bone.rotation.x = headRestRot.current.x + target.current.y * 0.10; // gentle up/down, chin safe
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export default function AvatarScene() {
  return (
    <div
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
        }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[2.5, 5, 2]} intensity={1.6} />
        <directionalLight position={[-2, 2, 1]} intensity={0.35} color="#fff5ea" />
        <Suspense fallback={null}>
          <AvatarModel />
        </Suspense>
      </Canvas>
    </div>
  );
}
