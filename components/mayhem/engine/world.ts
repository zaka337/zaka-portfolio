import * as THREE from "three";
import { Track, makeProj, type Proj } from "./track";
import {
  Merger, UNIT, lambert, basic, canvasTexture, roadTexture, stripeTexture, checkerTexture, signTexture,
  chevronTexture, crowdTexture, waterTexture, helipadTexture, softDot, disposeTree,
} from "./build";
import { clamp, lerp, smoothstep, fbm, rng } from "./util";

/* The island: terrain, water, road, bridge, military base, props and sky, all built from the
   track. Nothing here is a loaded asset; it is geometry made in code and merged into a small
   number of meshes. */

export interface Quality { low: boolean; shadow: number; trees: number }

export interface GridSlot { x: number; z: number; y: number; h: number }

export interface World {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  slots: GridSlot[];
  cpIdx: number[];
  heightAt(x: number, z: number): number;
  update(time: number, dt: number, cam: THREE.Vector3): void;
  setStartLights(red: number, green: boolean): void;
  flashCheckpoint(k: number): void;
  followSun(x: number, z: number): void;
  dispose(): void;
}

const WATER_Y = -0.8;
export const CP_COUNT = 8;

export function buildWorld(track: Track, q: Quality): World {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const rand = rng(20261021);
  const S = track.startIdx;
  const tmp: Proj = makeProj();
  const mk = () => ({ x: 0, z: 0, y: 0, h: 0 });
  const animated: ((t: number, dt: number) => void)[] = [];

  scene.background = new THREE.Color(0xbfe0f4);
  scene.fog = new THREE.Fog(0xcfe8f5, 140, 620);

  // ── materials ──
  const M: Record<string, THREE.Material> = {
    concrete: lambert(0xbab7af), concreteDark: lambert(0x8d8b85), red: lambert(0xc0392b), white: lambert(0xf0efe9),
    steel: lambert(0x7d8590), steelDark: lambert(0x474d55), sand: lambert(0xc9b57f), sandDark: lambert(0xa9966a),
    olive: lambert(0x5f6f3c), olive2: lambert(0x75844c), roofDark: lambert(0x3f4a35), roofRed: lambert(0x8d4a3a),
    wood: lambert(0x9a6b3d), woodDark: lambert(0x6e4a2a), glass: lambert(0x1b2a36), yellow: lambert(0xe8b923),
    orange: lambert(0xe86f1f), tire: lambert(0x1a1a1c), asphalt: lambert(0x45484e), pole: lambert(0x5b5f66),
    c1: lambert(0xc4472f), c2: lambert(0x2f6db5), c3: lambert(0xd9a21f), c4: lambert(0x3f8f5a), c5: lambert(0x7b8088),
    green: lambert(0x3f7f3a), bark: lambert(0x6b4a2e), rock: lambert(0x8c877c),
    lamp: basic(0xfff1c0), lampRed: basic(0xff4d3d), tent: lambert(0xb8a86e), tentGreen: lambert(0x65753f),
    barrier: lambert(0xd8d6ce), barrierRed: lambert(0xc4402f),
  };

  // ── lights and sky ──
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x7d8a5c, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.castShadow = q.shadow > 0;
  if (q.shadow > 0) {
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    const c = sun.shadow.camera;
    c.left = -58; c.right = 58; c.top = 58; c.bottom = -58; c.near = 5; c.far = 260;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.35;
  }
  scene.add(sun, sun.target);
  sun.position.set(70, 110, 45);
  const sunOff = new THREE.Vector3(70, 110, 45);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1700, 24, 14),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3b8fd8) }, mid: { value: new THREE.Color(0x9fd2f2) }, hor: { value: new THREE.Color(0xdcecf2) }, sunDir: { value: sunOff.clone().normalize() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.2,0.85,h)); float s = max(dot(normalize(vP), sunDir),0.0); c += vec3(1.0,0.9,0.7) * pow(s, 90.0) * 0.9 + vec3(1.0,0.85,0.6) * pow(s, 6.0) * 0.12; gl_FragColor = vec4(c,1.0); }",
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // clouds: soft sprites drifting very slowly
  const dot = softDot();
  const cloudMat = new THREE.SpriteMaterial({ map: dot, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const clouds: THREE.Sprite[] = [];
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(cloudMat);
    const a = rand() * Math.PI * 2, r = 500 + rand() * 700;
    s.position.set(Math.cos(a) * r, 140 + rand() * 160, Math.sin(a) * r);
    s.scale.set(220 + rand() * 260, 60 + rand() * 40, 1);
    clouds.push(s); scene.add(s);
  }

  // distant hills around the horizon, hazed by the fog
  {
    const m = new Merger();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + rand() * 0.2, r = 820 + rand() * 260;
      const w = 160 + rand() * 220, h = 50 + rand() * 120;
      m.add(UNIT.cone, "far", Math.cos(a) * r, h * 0.35 - 12, Math.sin(a) * r, rand() * 6, w, h, w * 0.7);
    }
    M.far = lambert(0x6f8da3, { fog: true });
    m.build(M, root, false, false);
  }

  // ── terrain ──
  const b = track.bounds;
  const cs = q.low ? 6 : 4;
  const minX = Math.floor(b.minX - 120), maxX = Math.ceil(b.maxX + 120);
  const minZ = Math.floor(b.minZ - 120), maxZ = Math.ceil(b.maxZ + 150);
  const nx = Math.ceil((maxX - minX) / cs) + 1, nz = Math.ceil((maxZ - minZ) / cs) + 1;
  const heights = new Float32Array(nx * nz);
  const baseMask = new Float32Array(nx * nz);   // 1 on the flat ground of the base
  const bridgeNear = (i: number) => {
    // distance in samples to the bridge, 0 on it
    if (track.bridge[i]) return 0;
    const f = ((track.bridgeFrom - i) + track.n) % track.n, t = ((i - track.bridgeTo) + track.n) % track.n;
    return Math.min(f, t);
  };
  const baseW = (i: number) => {
    const a = ((i - S + track.n) % track.n);
    const da = a > track.n / 2 ? a - track.n : a;   // samples along from the start line
    return 1 - smoothstep(0, 36, Math.max(-70 - da, da - 175, 0));
  };
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = minX + ix * cs, z = minZ + iz * cs;
      const p = track.projectGlobal(x, z, tmp);
      const d = p.dist;
      const bw = baseW(p.i);
      const onBaseSide = p.d > 0 ? bw : 0;
      const landR = lerp(60, 104, onBaseSide);
      const land = 1 - smoothstep(lerp(12, 76, onBaseSide), landR, d);
      const hillAmp = lerp(1, 0, onBaseSide) * (6 + 9 * smoothstep(-60, 200, x));
      const hills = Math.max(-1.5, (fbm(x * 0.022, z * 0.022) - 0.4) * hillAmp * smoothstep(13, 34, d));
      let h = lerp(-4.5, p.y - 0.4 + hills, Math.pow(land, 0.7));
      const bn = bridgeNear(p.i);
      if (bn < 30) {
        const w = (1 - bn / 30) * (1 - smoothstep(9.5, 30, d));
        h = lerp(h, -4.5, bn === 0 ? w : w * 0.9);
      }
      heights[iz * nx + ix] = h;
      baseMask[iz * nx + ix] = onBaseSide > 0.5 && d > 12 && d < 98 ? 1 : 0;
    }
  }
  const tGeo = new THREE.BufferGeometry();
  {
    const P = new Float32Array(nx * nz * 3), C = new Float32Array(nx * nz * 3);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix;
      P[k * 3] = minX + ix * cs; P[k * 3 + 1] = heights[k]; P[k * 3 + 2] = minZ + iz * cs;
    }
    const idx: number[] = [];
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, bq = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, bq, bq, c, d);
    }
    tGeo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    tGeo.setIndex(idx);
    tGeo.computeVertexNormals();
    const N = tGeo.attributes.normal as THREE.BufferAttribute;
    const col = new THREE.Color();
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix, h = heights[k], x = minX + ix * cs, z = minZ + iz * cs;
      const slope = 1 - N.getY(k);
      const n1 = fbm(x * 0.07, z * 0.07, 3);
      if (h < -1.8) col.setHex(0x2a7587);
      else if (h < -0.15) col.setHex(0xe3d29c).lerp(new THREE.Color(0xb3b98a), smoothstep(-0.8, -0.15, h) * 0.4);
      else if (baseMask[k]) col.setHex(0xb2a07a).lerp(new THREE.Color(0x9b9a92), n1);
      else if (slope > 0.2 || h > 9) col.setHex(0x8b867a).lerp(new THREE.Color(0x6c675d), n1);
      else col.setHex(0x74b04c).lerp(new THREE.Color(0x4d8a3a), n1 * 0.9).lerp(new THREE.Color(0x9bbd5a), smoothstep(0.55, 0.8, n1) * 0.4);
      if (h >= -0.15 && h < 0.55 && !baseMask[k]) col.lerp(new THREE.Color(0xdbc88f), 0.45); // a strip of beach
      C[k * 3] = col.r; C[k * 3 + 1] = col.g; C[k * 3 + 2] = col.b;
    }
    tGeo.setAttribute("color", new THREE.BufferAttribute(C, 3));
  }
  const terrain = new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.receiveShadow = true;
  root.add(terrain);
  const heightAt = (x: number, z: number) => {
    const fx = clamp((x - minX) / cs, 0, nx - 1.001), fz = clamp((z - minZ) / cs, 0, nz - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
    const a = heights[iz * nx + ix], bq = heights[iz * nx + ix + 1], c = heights[(iz + 1) * nx + ix], d = heights[(iz + 1) * nx + ix + 1];
    return lerp(lerp(a, bq, u), lerp(c, d, u), v);
  };

  // ── water ──
  const wTex = waterTexture();
  wTex.repeat.set(70, 70);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(3400, 3400),
    new THREE.MeshPhongMaterial({ color: 0x2c96d4, map: wTex, shininess: 110, specular: 0xbfe6ff, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  water.receiveShadow = true;
  root.add(water);
  animated.push((t) => { wTex.offset.set(t * 0.004, t * 0.0027); });

  // ── road, curbs ──
  const ribbon = (latA: number, latB: number, yOff: number, vScale: number) => {
    const n = track.n;
    const P = new Float32Array((n + 1) * 6), UV = new Float32Array((n + 1) * 4);
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const p0 = track.at(i, latA, mk()); const x0 = p0.x, z0 = p0.z, y0 = p0.y;
      const p1 = track.at(i, latB, mk());
      P.set([x0, y0 + yOff, z0, p1.x, p1.y + yOff, p1.z], i * 6);
      UV.set([0, (i * track.ds) / vScale, 1, (i * track.ds) / vScale], i * 4);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(UV, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const roadTex = roadTexture();
  const road = new THREE.Mesh(ribbon(-track.halfW, track.halfW, 0.04, 16), new THREE.MeshLambertMaterial({ map: roadTex }));
  road.receiveShadow = true;
  root.add(road);
  const curbTex = stripeTexture("#d8352a", "#f4f3ee");
  const curbMat = new THREE.MeshLambertMaterial({ map: curbTex });
  for (const [a, b2] of [[-track.halfW, -track.halfW + 0.9], [track.halfW - 0.9, track.halfW]] as const) {
    const c = new THREE.Mesh(ribbon(a, b2, 0.07, 3), curbMat);
    c.receiveShadow = true;
    root.add(c);
  }

  // ── barriers on both sides (concrete on land, guard rails on the bridge) ──
  {
    const m = new Merger();
    for (let i = 0; i < track.n; i += 4) {
      const onB = track.bridge[i] === 1;
      for (const side of [-1, 1]) {
        const p = track.at(i + 2, side * 9.0, mk());
        if (onB) {
          m.box("steel", p.x, p.y + 0.5, p.z, 0.22, 1.0, 4.1, p.h);
          m.box("white", p.x, p.y + 0.95, p.z, 0.3, 0.16, 4.1, p.h);
          m.box("steelDark", p.x, p.y + 0.5, p.z, 0.2, 0.12, 4.1, p.h);
        } else {
          const red = (i / 4) % 5 === 0;
          m.box(red ? "barrierRed" : "barrier", p.x, p.y + 0.5, p.z, 0.8, 1.0, 4.08, p.h);
          m.box(red ? "white" : "concreteDark", p.x - 0.0, p.y + 1.02, p.z, 0.5, 0.1, 4.08, p.h);
        }
      }
    }
    m.build(M, root, true, true);
  }

  // ── the bridge ──
  const lampMats: THREE.Material[] = [];
  {
    const m = new Merger();
    const bf = track.bridgeFrom, bt = track.bridgeTo, len = bt - bf;
    for (let i = bf; i <= bt; i += 3) {
      const p = track.at(i, 0, mk());
      m.box("concrete", p.x, p.y - 0.75, p.z, 18.0, 1.4, 3.3, p.h);
      m.box("concreteDark", p.x, p.y - 1.55, p.z, 14.0, 0.3, 3.3, p.h);
    }
    // piers
    for (let i = bf + 10; i < bt; i += 22) {
      const p = track.at(i, 0, mk());
      for (const lat of [-5, 5]) {
        const q2 = track.at(i, lat, mk());
        m.cyl("concrete", q2.x, (p.y - 1.5 + -4.5) / 2, q2.z, 1.25, p.y - 1.5 + 4.5, 0, 0, 0);
        m.cyl("concreteDark", q2.x, -4.4, q2.z, 1.7, 0.7);
      }
      m.box("concrete", p.x, p.y - 2.2, p.z, 14, 1.1, 2.3, p.h);
    }
    // lamps
    for (let i = bf + 6; i < bt; i += 24) {
      const side = ((i - bf) / 24) % 2 === 0 ? 1 : -1;
      const p = track.at(i, side * 8.9, mk());
      m.cyl("pole", p.x, p.y + 3.2, p.z, 0.13, 6.4);
      const inw = track.at(i, side * 7.6, mk());
      m.box("pole", (p.x + inw.x) / 2, p.y + 6.3, (p.z + inw.z) / 2, 0.18, 0.18, 1.9, p.h + Math.PI / 2);
      m.sphere("lamp", inw.x, p.y + 6.15, inw.z, 0.42, 0.22, 0.42);
    }
    // abutments where the bridge meets the land
    for (const i of [bf - 3, bt + 3]) {
      const p = track.at(i, 0, mk());
      m.box("concrete", p.x, p.y - 2.4, p.z, 19, 5.4, 5.5, p.h);
    }
    // two towers with cables, hangers: a suspension bridge
    const towers = [bf + Math.round(len * 0.27), bf + Math.round(len * 0.73)];
    const topY = (i: number) => track.y[i % track.n] + 24;
    for (const ti of towers) {
      const p = track.at(ti, 0, mk());
      for (const lat of [-9.6, 9.6]) {
        const q2 = track.at(ti, lat, mk());
        m.box("steel", q2.x, p.y + 11.5, q2.z, 1.5, 25.5, 1.5, p.h);
        m.box("steelDark", q2.x, p.y + 11.5, q2.z, 1.9, 0.5, 1.9, p.h);
      }
      m.box("steel", p.x, p.y + 23.2, p.z, 21.4, 1.2, 1.5, p.h);
      m.box("steel", p.x, p.y + 15.0, p.z, 19.6, 0.9, 1.2, p.h);
      m.box("red", p.x, p.y + 24.6, p.z, 1.0, 1.0, 1.0, p.h);
    }
    // main cables (a parabola between anchor, tower, tower, anchor) and hangers
    const cableY = (i: number) => {
      const a = bf, b1 = towers[0], b2 = towers[1], c = bt;
      const deck = track.y[i] + 0.9;
      if (i <= b1) { const u = (i - a) / (b1 - a); return lerp(deck + 0.4, topY(b1) - 0.6, u) - 5 * 4 * u * (1 - u) * 0 + 0; }
      if (i >= b2) { const u = (i - b2) / (c - b2); return lerp(topY(b2) - 0.6, deck + 0.4, u); }
      const u = (i - b1) / (b2 - b1);
      const ends = lerp(topY(b1), topY(b2), u) - 0.6;
      return ends - 15 * 4 * u * (1 - u);
    };
    for (const lat of [-9.6, 9.6]) {
      const pts: THREE.Vector3[] = [];
      for (let i = bf; i <= bt; i += 6) { const q2 = track.at(i, lat, mk()); pts.push(new THREE.Vector3(q2.x, cableY(i), q2.z)); }
      const q3 = track.at(bt, lat, mk()); pts.push(new THREE.Vector3(q3.x, cableY(bt), q3.z));
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 4, 0.28, 6, false);
      const cm = new THREE.Mesh(tube, M.steel); cm.castShadow = true; root.add(cm);
      for (let i = bf + 8; i < bt - 4; i += 8) {
        const q2 = track.at(i, lat, mk()), cy = cableY(i), dy = cy - (q2.y + 1.0);
        if (dy > 1) m.cyl("steelDark", q2.x, q2.y + 1.0 + dy / 2, q2.z, 0.07, dy);
      }
    }
    m.build(M, root, true, true);
  }

  // ── start / finish gantry, checkpoint arches, grid ──
  const startLamps: THREE.MeshBasicMaterial[] = [new THREE.MeshBasicMaterial({ color: 0x3a0d0d }), new THREE.MeshBasicMaterial({ color: 0x3a0d0d }), new THREE.MeshBasicMaterial({ color: 0x3a0d0d })];
  {
    const sp = track.at(S, 0, mk());
    const g = new THREE.Group();
    g.position.set(sp.x, sp.y, sp.z);
    g.rotation.y = sp.h;
    for (const sx of [-10.4, 10.4]) {
      const post = new THREE.Mesh(UNIT.box, M.steelDark); post.scale.set(0.9, 12, 0.9); post.position.set(sx, 6, 0); post.castShadow = true; g.add(post);
    }
    const beam = new THREE.Mesh(UNIT.box, M.steelDark); beam.scale.set(22, 1.5, 1.2); beam.position.set(0, 11.6, 0); beam.castShadow = true; g.add(beam);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.4), new THREE.MeshBasicMaterial({ map: signTexture("START / FINISH", "#111418", "#ffd23f", 1024, 154, "900 92px Helvetica, Arial, sans-serif"), side: THREE.DoubleSide }));
    banner.position.set(0, 13.3, 0); banner.rotation.y = Math.PI; g.add(banner);
    const chk = checkerTexture(40, 2, 16);
    chk.wrapS = chk.wrapT = THREE.RepeatWrapping;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.9), new THREE.MeshBasicMaterial({ map: chk, side: THREE.DoubleSide }));
    strip.position.set(0, 10.7, 0.62); g.add(strip);
    const panel = new THREE.Mesh(UNIT.box, M.steelDark); panel.scale.set(8, 2.2, 0.6); panel.position.set(0, 9.0, 0); g.add(panel);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(UNIT.sphere, startLamps[i]); lamp.scale.set(0.8, 0.8, 0.5); lamp.position.set(-2.4 + i * 2.4, 9.0, 0.4); g.add(lamp);
      const lamp2 = lamp.clone(); lamp2.position.z = -0.4; g.add(lamp2);
    }
    root.add(g);
    // the painted line across the road, and the grid boxes behind it
    const line = new THREE.Mesh(new THREE.PlaneGeometry(track.halfW * 2, 1.4), new THREE.MeshBasicMaterial({ map: checkerTexture(32, 2, 16), transparent: false }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = sp.h;
    line.position.set(sp.x, sp.y + 0.09, sp.z); root.add(line);
  }
  const slots: GridSlot[] = [];
  {
    const m = new Merger();
    const lat = [-3.6, 3.6, -3.6, 3.6], back = [7, 12, 19, 24];
    for (let s = 0; s < 4; s++) {
      const p = track.at(S - back[s], lat[s], mk());
      slots.push({ x: p.x, z: p.z, y: p.y, h: p.h });
      m.box("white", p.x, p.y + 0.08, p.z, 3.4, 0.02, 0.18, p.h);
      for (const side of [-1.7, 1.7]) {
        const q2 = track.at(S - back[s] - 1.5, lat[s] + side, mk());
        m.box("white", q2.x, q2.y + 0.08, q2.z, 0.18, 0.02, 3.2, q2.h);
      }
    }
    m.build(M, root, false, true);
  }
  // checkpoint arches
  const cpIdx: number[] = [];
  const cpBanners: { mat: THREE.MeshBasicMaterial; t: number }[] = [];
  {
    const m = new Merger();
    for (let k = 0; k < CP_COUNT; k++) {
      const i = track.wrap(S + Math.round(((k + 1) / (CP_COUNT + 1)) * track.n));
      cpIdx.push(i);
      const p = track.at(i, 0, mk());
      for (const lat of [-9.8, 9.8]) {
        const q2 = track.at(i, lat, mk());
        m.box("orange", q2.x, q2.y + 4.7, q2.z, 0.6, 9.4, 0.6, p.h);
        m.box("steelDark", q2.x, q2.y + 0.2, q2.z, 1.2, 0.4, 1.2, p.h);
      }
      m.box("steelDark", p.x, p.y + 9.2, p.z, 20.6, 0.5, 0.5, p.h);
      const mat = new THREE.MeshBasicMaterial({ map: signTexture(`CHECKPOINT ${k + 1}`, "#e8731f", "#fff7e6", 512, 96, "900 52px Helvetica, Arial, sans-serif"), side: THREE.DoubleSide });
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), mat);
      ban.position.set(p.x, p.y + 8.2, p.z); ban.rotation.y = p.h + Math.PI; root.add(ban);
      cpBanners.push({ mat, t: 0 });
    }
    m.build(M, root, true, true);
  }

  // ── corner warning signs (chevrons) ──
  {
    const tex = chevronTexture();
    const texL = chevronTexture(); texL.wrapS = THREE.RepeatWrapping; texL.repeat.x = -1; texL.offset.x = 1;
    const mats = [new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: texL })];
    const posts = new Merger();
    const wide = new Float32Array(track.n);
    for (let i = 0; i < track.n; i++) { let s = 0; for (let k = -10; k <= 10; k += 2) s += track.curv[(i + k + track.n) % track.n]; wide[i] = s / 11; }
    let last = -999;
    for (let i = 0; i < track.n; i++) {
      const c = wide[i];
      if (Math.abs(c) < 0.02 || track.bridge[i]) continue;
      let peak = true;
      for (let k = -14; k <= 14; k++) if (Math.abs(wide[(i + k + track.n) % track.n]) > Math.abs(c)) { peak = false; break; }
      if (!peak || i - last < 40) continue;
      last = i;
      const outside = c > 0 ? 1 : -1;     // a left turn: the outside is the right-hand side
      const p = track.at(i - 38, outside * 11.5, mk());
      posts.cyl("pole", p.x, p.y + 1.6, p.z, 0.1, 3.2);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), mats[c > 0 ? 0 : 1]);
      sign.position.set(p.x, p.y + 3.8, p.z); sign.rotation.y = p.h + Math.PI; root.add(sign);
      posts.box("pole", p.x, p.y + 3.8, p.z, 3.4, 3.4, 0.08, p.h);
    }
    posts.build(M, root, true, true);
  }

  // ── the military base ──
  const rotors: THREE.Object3D[] = [];
  const flagInst: { mesh: THREE.InstancedMesh; base: THREE.Matrix4[]; phase: number[] } = { mesh: null as unknown as THREE.InstancedMesh, base: [], phase: [] };
  {
    const m = new Merger();
    const at = (a: number, lat: number) => track.at(S + a, lat, mk());
    const ground = -0.32;
    const boxAt = (key: string, a: number, lat: number, y: number, w: number, h: number, d: number, rot = 0) => {
      // w across (lateral), d along the road
      const p = at(a, lat);
      m.box(key, p.x, ground + y, p.z, w, h, d, p.h + rot);
    };
    const cylAt = (key: string, a: number, lat: number, y: number, r: number, h: number) => {
      const p = at(a, lat);
      m.cyl(key, p.x, ground + y, p.z, r, h);
    };

    // perimeter fence along the road, with a gap for the gate
    for (let a = -92; a <= 122; a += 5) {
      if (a > 28 && a < 48) continue;
      const p = at(a, 15);
      m.box("steelDark", p.x, ground + 1.1, p.z, 0.16, 2.2, 0.16, p.h);
      const q2 = at(a + 2.5, 15);
      m.box("steel", q2.x, ground + 0.75, q2.z, 0.07, 0.07, 5.05, q2.h);
      m.box("steel", q2.x, ground + 1.45, q2.z, 0.07, 0.07, 5.05, q2.h);
      m.box("steel", q2.x, ground + 2.15, q2.z, 0.07, 0.07, 5.05, q2.h);
      m.box("steelDark", q2.x, ground + 1.1, q2.z, 0.03, 1.6, 5.0, q2.h);
    }
    // the entrance: a short road, two booths, a barrier arm and a sign
    {
      const p = at(38, 36);
      m.box("asphalt", p.x, ground + 0.05, p.z, 36, 0.12, 9.5, p.h + Math.PI / 2);
      const plaza = at(38, 66);
      m.box("asphalt", plaza.x, ground + 0.05, plaza.z, 24, 0.12, 30, plaza.h);
      for (const sd of [-1, 1]) {
        boxAt("sand", 38 + sd * 7.2, 17.5, 1.4, 3.2, 2.8, 3.2);
        boxAt("roofDark", 38 + sd * 7.2, 17.5, 2.95, 4.2, 0.3, 4.2);
        boxAt("glass", 38 + sd * 7.2, 15.85, 1.7, 0.1, 1.0, 2.4);
        for (let k = 0; k < 4; k++) boxAt("sandDark", 38 + sd * 3.2, 17 + (k % 2) * 0.1, 0.4 + Math.floor(k / 2) * 0.4, 1.6, 0.38, 0.8);
      }
      // barrier arm, lowered across the entrance
      for (let k = 0; k < 8; k++) boxAt(k % 2 ? "white" : "red", 34.5 + k, 22, 1.25, 0.28, 0.28, 1.0);
      // overhead sign
      for (const sd of [-1, 1]) boxAt("steelDark", 38 + sd * 8.5, 28, 3.4, 0.5, 6.8, 0.5);
      boxAt("steelDark", 38, 28, 6.9, 0.5, 0.5, 17.5);
    }
    // sandbags: walls around the booths and along the shore
    const bag = (a: number, lat: number, y: number, rot: number) => {
      const p = at(a, lat);
      m.box(rand() > 0.5 ? "sand" : "sandDark", p.x, ground + 0.22 + y, p.z, 1.15, 0.42, 0.62, p.h + rot + (rand() - 0.5) * 0.12);
    };
    for (let k = 0; k < 10; k++) for (let r = 0; r < 3; r++) bag(14 + k * 1.1 + (r % 2) * 0.55, 19.5, r * 0.4, 0);
    for (let k = 0; k < 10; k++) for (let r = 0; r < 3; r++) bag(52 + k * 1.1 + (r % 2) * 0.55, 19.5, r * 0.4, 0);
    for (let k = 0; k < 14; k++) for (let r = 0; r < 2; r++) bag(70 + k * 1.1, -16.5, r * 0.4, 0);

    // barracks: two rows of long low buildings with gable roofs, windows and doors
    const barracks = (a: number, lat: number, len: number, wall: string, roof: string) => {
      const p = at(a, lat);
      m.box(wall, p.x, ground + 1.7, p.z, 6.2, 3.4, len, p.h);
      m.add(UNIT.prism, roof, p.x, ground + 3.3, p.z, p.h, 7.4, 2.0, len + 1.0);
      for (let k = -Math.floor(len / 4); k <= Math.floor(len / 4); k++) {
        for (const sd of [-1, 1]) {
          const w = at(a + k * 3.2, lat + sd * 3.12);
          m.box("glass", w.x, ground + 2.0, w.z, 0.12, 1.0, 1.3, w.h);
          m.box("white", w.x, ground + 2.0, w.z, 0.08, 1.2, 1.5, w.h);
        }
      }
      const door = at(a + len / 2 + 0.05, lat);
      m.box("woodDark", door.x, ground + 1.2, door.z, 1.6, 2.4, 0.12, door.h);
      m.box("concreteDark", p.x, ground + 0.15, p.z, 6.6, 0.3, len + 0.4, p.h);
    };
    for (const [a, lat] of [[-52, 32], [-24, 32], [4, 32], [72, 32], [100, 32], [-44, 60], [-14, 60], [16, 60], [78, 60], [106, 60]] as const) {
      const alt = ((a + lat) / 4) % 2 === 0;
      barracks(a, lat, 14, alt ? "sand" : "olive2", alt ? "roofDark" : "roofRed");
    }
    // a hangar: a barrel-vaulted shed with doors
    {
      const p = at(46, 92);
      m.cyl("concrete", p.x, ground, p.z, 9, 26, p.h, Math.PI / 2, 0, 1, 0.82);
      for (const sd of [-1, 1]) { const e = at(46 + sd * 13.1, 92); m.box("steelDark", e.x, ground + 3.0, e.z, 13, 6.0, 0.4, e.h); m.box("yellow", e.x, ground + 6.2, e.z, 13.4, 0.3, 0.6, e.h); }
    }
    // watchtowers
    const tower = (a: number, lat: number) => {
      const p = at(a, lat);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const q2 = at(a + sz * 1.3, lat + sx * 1.3);
        m.box("wood", q2.x, ground + 4.3, q2.z, 0.38, 8.6, 0.38, p.h);
      }
      m.box("woodDark", p.x, ground + 4.5, p.z, 3.0, 0.25, 0.25, p.h + Math.PI / 4, 0, 0.0);
      m.box("woodDark", p.x, ground + 4.5, p.z, 3.0, 0.25, 0.25, p.h - Math.PI / 4);
      m.box("wood", p.x, ground + 8.7, p.z, 3.8, 0.3, 3.8, p.h);
      m.box("olive", p.x, ground + 9.6, p.z, 3.0, 1.6, 3.0, p.h);
      m.box("glass", p.x, ground + 9.9, p.z, 3.1, 0.55, 3.1, p.h);
      m.add(UNIT.prism, "roofDark", p.x, ground + 10.4, p.z, p.h + Math.PI / 2, 3.9, 1.2, 3.9);
      m.cyl("steelDark", p.x, ground + 11.4, p.z, 0.08, 1.0);
      m.box("lamp", p.x, ground + 8.95, p.z + 0, 0.5, 0.35, 0.5, p.h);
    };
    for (const [a, lat] of [[-84, 18], [118, 18], [-40, 92], [122, 92]] as const) tower(a, lat);
    tower(80, -19); tower(-30, -19);
    // shipping containers in stacks
    {
      const keys = ["c1", "c2", "c3", "c4", "c5"];
      const stacks: [number, number, number, number][] = [[-70, 78, 3, 0], [-70, 83, 2, 1], [-62, 78, 2, 2], [-62, 83, 3, 3], [-54, 80, 1, 4], [82, 84, 2, 0], [90, 84, 3, 2], [98, 84, 1, 1], [86, 90, 2, 3], [118, 62, 2, 4]];
      for (const [a, lat, h, k] of stacks) for (let y = 0; y < h; y++) {
        const p = at(a, lat);
        m.box(keys[(k + y) % 5], p.x, ground + 1.3 + y * 2.62, p.z, 2.5, 2.6, 6.1, p.h + (k % 2 ? 0.04 : 0));
        m.box("steelDark", p.x, ground + 0.05 + y * 2.62 + 2.6, p.z, 2.55, 0.1, 6.15, p.h);
      }
    }
    // crates, barrels and concrete blocks
    for (let k = 0; k < 26; k++) {
      const a = -20 + rand() * 110, lat = 44 + rand() * 40;
      if (a > 26 && a < 52 && lat < 76) continue;
      const p = at(a, lat);
      if (k % 3 === 0) { m.cyl(k % 2 ? "red" : "olive", p.x, ground + 0.55, p.z, 0.42, 1.1); m.cyl("steelDark", p.x, ground + 1.12, p.z, 0.4, 0.06); }
      else { const s = 0.9 + rand() * 0.7; m.box(k % 2 ? "wood" : "woodDark", p.x, ground + s / 2, p.z, s, s, s, p.h + rand()); }
    }
    for (let k = 0; k < 8; k++) { const p = at(8 + k * 2.2, 21 + (k % 2) * 1.6); m.box("concrete", p.x, ground + 0.55, p.z, 0.9, 1.1, 2.0, p.h + (k % 2 ? 0.25 : -0.25)); }
    // tents
    for (const [a, lat, k] of [[-30, 82, 0], [-24, 86, 1], [-36, 88, 0]] as const) {
      const p = at(a, lat);
      m.add(UNIT.prism, k ? "tentGreen" : "tent", p.x, ground, p.z, p.h, 4.4, 2.6, 7);
    }
    // parked vehicles: jeeps, a truck and a toy tank
    const jeep = (a: number, lat: number, rot: number, colour: string) => {
      const p = at(a, lat), h = p.h + rot;
      m.box(colour, p.x, ground + 0.95, p.z, 2.0, 0.8, 3.8, h);
      const f = (dx: number, dz: number) => ({ x: p.x + Math.cos(h) * dx + Math.sin(h) * dz, z: p.z - Math.sin(h) * dx + Math.cos(h) * dz });
      const hood = f(0, 1.5); m.box(colour, hood.x, ground + 1.45, hood.z, 1.8, 0.4, 1.3, h);
      const cab = f(0, -0.5); m.box("glass", cab.x, ground + 1.7, cab.z, 1.7, 0.7, 0.08, h, -0.3);
      const bar = f(0, -1.0); m.box("steelDark", bar.x, ground + 1.9, bar.z, 1.9, 0.12, 0.12, h);
      for (const sx of [-1, 1]) for (const sz of [-1.2, 1.3]) { const w = f(sx * 1.05, sz); m.cyl("tire", w.x, ground + 0.5, w.z, 0.5, 0.45, h, 0, Math.PI / 2); }
    };
    jeep(-6, 40, 0.3, "olive"); jeep(2, 44, -0.2, "olive2"); jeep(60, 44, 0.5, "sandDark");
    {
      const p = at(-38, 48), h = p.h + 0.2;
      m.box("olive", p.x, ground + 1.7, p.z, 2.7, 1.5, 3.6, h);
      const cab = (dz: number) => ({ x: p.x + Math.sin(h) * dz, z: p.z + Math.cos(h) * dz });
      const c = cab(1.8); m.box("olive", c.x, ground + 1.7, c.z, 2.6, 2.2, 1.8, h);
      m.box("glass", cab(2.75).x, ground + 2.0, cab(2.75).z, 2.2, 0.9, 0.08, h);
      const bed = cab(-1.5); m.box("tentGreen", bed.x, ground + 2.9, bed.z, 2.5, 1.7, 4.2, h);
    }
    {
      const p = at(96, 48), h = p.h - 0.35;
      m.box("olive2", p.x, ground + 1.0, p.z, 3.6, 1.2, 6.0, h);
      m.box("olive", p.x, ground + 2.0, p.z, 2.6, 0.9, 3.0, h);
      m.cyl("steelDark", p.x + Math.sin(h) * 3.5, ground + 2.0, p.z + Math.cos(h) * 3.5, 0.18, 4.2, h, Math.PI / 2);
      for (const sd of [-1, 1]) { const tr = at(96, 48 + sd * 1.8); m.box("tire", tr.x, ground + 0.6, tr.z, 0.9, 1.2, 6.2, h); }
    }
    // helipad with a small helicopter
    {
      const p = at(8, 88);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 28), new THREE.MeshLambertMaterial({ map: helipadTexture() }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(p.x, ground + 0.09, p.z); pad.receiveShadow = true; root.add(pad);
      const g = new THREE.Group(); g.position.set(p.x, ground + 0.1, p.z); g.rotation.y = p.h + 0.6;
      const body = new THREE.Mesh(UNIT.sphere, M.olive); body.scale.set(1.5, 1.4, 2.5); body.position.y = 1.9; body.castShadow = true; g.add(body);
      const boom = new THREE.Mesh(UNIT.box, M.olive); boom.scale.set(0.35, 0.4, 3.4); boom.position.set(0, 2.2, -3.8); g.add(boom);
      const fin = new THREE.Mesh(UNIT.box, M.olive2); fin.scale.set(0.12, 1.2, 0.8); fin.position.set(0, 2.8, -5.3); g.add(fin);
      const win = new THREE.Mesh(UNIT.sphere, M.glass); win.scale.set(1.1, 0.8, 1.2); win.position.set(0, 2.15, 1.3); g.add(win);
      for (const sx of [-1, 1]) { const sk = new THREE.Mesh(UNIT.box, M.steelDark); sk.scale.set(0.15, 0.15, 3.4); sk.position.set(sx * 1.2, 0.45, 0); g.add(sk); const st = new THREE.Mesh(UNIT.box, M.steelDark); st.scale.set(0.12, 1.0, 0.12); st.position.set(sx * 1.1, 1.0, 0.6); g.add(st); }
      const rot = new THREE.Group(); rot.position.y = 3.35;
      for (let k = 0; k < 2; k++) { const bl = new THREE.Mesh(UNIT.box, M.steelDark); bl.scale.set(0.3, 0.05, 9); bl.rotation.y = k * Math.PI / 2; rot.add(bl); }
      g.add(rot); root.add(g); rotors.push(rot);
    }
    // a radar dish
    {
      const p = at(-6, 98);
      m.cyl("steelDark", p.x, ground + 3, p.z, 0.3, 6);
      m.box("concrete", p.x, ground + 0.4, p.z, 2.4, 0.8, 2.4, p.h);
      const dish = new THREE.Group(); dish.position.set(p.x, ground + 6.2, p.z);
      const bowl = new THREE.Mesh(UNIT.sphere, M.white); bowl.scale.set(2.2, 0.55, 2.2); bowl.position.y = 0; bowl.rotation.x = 0.4; dish.add(bowl);
      const arm = new THREE.Mesh(UNIT.cyl, M.steelDark); arm.scale.set(0.07, 1.6, 0.07); arm.position.set(0, 0.8, 0.6); arm.rotation.x = 0.4; dish.add(arm);
      root.add(dish); rotors.push(dish);
    }
    // grandstand beside the start line, behind the fence
    {
      const crowdMat = new THREE.MeshLambertMaterial({ map: crowdTexture() });
      M.crowd = crowdMat;
      for (let r = 0; r < 5; r++) {
        const p = at(0, 19.5 + r * 1.7);
        m.box("concrete", p.x, ground + (r + 1) * 0.55, p.z, 1.7, (r + 1) * 1.1, 44, p.h);
        m.box("crowd", p.x - 0, ground + (r + 1) * 1.1 + 0.55, p.z, 1.2, 1.1, 43.6, p.h);
      }
      for (const a of [-20, 20]) { const p = at(a, 27); m.box("steelDark", p.x, ground + 6.2, p.z, 0.4, 12.4, 0.4, p.h); }
      const roof = at(0, 25);
      m.box("red", roof.x, ground + 12.4, roof.z, 11, 0.4, 46, roof.h);
      m.box("white", roof.x, ground + 12.7, roof.z, 11, 0.14, 46, roof.h);
    }
    // flags along the straight (these wave)
    {
      const fm = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const count = 14;
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 1.4), fm, count);
      const col = new THREE.Color();
      const palette = [0xe8731f, 0xffd23f, 0x3aa0ff, 0xf4f4f0, 0xc4472f, 0x37c779];
      for (let k = 0; k < count; k++) {
        const a = -34 + Math.floor(k / 2) * 10, lat = k % 2 ? 11.5 : -11.5;
        const p = at(a, lat);
        m.cyl("pole", p.x, ground + 3.5, p.z, 0.09, 7);
        const mt = new THREE.Matrix4().compose(new THREE.Vector3(p.x, ground + 6.2, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.h + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
        flagInst.base.push(mt); flagInst.phase.push(rand() * 6);
        im.setMatrixAt(k, mt); im.setColorAt(k, col.setHex(palette[k % palette.length]));
      }
      flagInst.mesh = im; root.add(im);
    }
    // a flagpole at the gate
    {
      const p = at(30, 14);
      m.cyl("steel", p.x, ground + 6, p.z, 0.12, 12);
      m.box("red", p.x + Math.cos(p.h) * 1.7, ground + 11, p.z - Math.sin(p.h) * 1.7, 3.2, 1.8, 0.05, p.h + Math.PI / 2);
    }
    m.build(M, root, true, true);
  }

  // ── trees, bushes, rocks (instanced), lighthouse ──
  {
    const treeCount = q.trees;
    const cones = new THREE.InstancedMesh(UNIT.cone, M.green, treeCount * 2);
    const trunks = new THREE.InstancedMesh(UNIT.cylLow, M.bark, treeCount);
    const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.rock, Math.round(treeCount * 0.45));
    const mt = new THREE.Matrix4(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    let ti = 0, ri = 0, tries = 0;
    while ((ti < treeCount || ri < rocks.count) && tries++ < 20000) {
      const x = minX + 10 + rand() * (maxX - minX - 20), z = minZ + 10 + rand() * (maxZ - minZ - 20);
      const h = heightAt(x, z);
      if (h < -0.05) continue;
      const p = track.projectGlobal(x, z, tmp);
      if (p.dist < 13) continue;
      if (p.d > 0 && baseW(p.i) > 0.15 && p.dist < 104) continue;   // keep the base clear
      const n1 = fbm(x * 0.05, z * 0.05, 2);
      if (ri < rocks.count && (rand() < 0.22 || h > 8)) {
        const s = 0.8 + rand() * 2.4;
        qt.setFromEuler(new THREE.Euler(rand() * 3, rand() * 6, rand() * 3));
        mt.compose(ps.set(x, h + s * 0.25, z), qt, sc.set(s * 1.3, s * 0.8, s));
        rocks.setMatrixAt(ri, mt); rocks.setColorAt(ri, col.setHex(0x8c877c).offsetHSL(0, 0, (rand() - 0.5) * 0.1)); ri++;
        continue;
      }
      if (ti < treeCount && n1 > 0.38 && h < 11) {
        const s = 1.0 + rand() * 1.2;
        qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6);
        mt.compose(ps.set(x, h + s * 0.7, z), qt, sc.set(0.35 * s, 1.4 * s, 0.35 * s)); trunks.setMatrixAt(ti, mt);
        mt.compose(ps.set(x, h + s * 2.0, z), qt, sc.set(1.7 * s, 3.4 * s, 1.7 * s)); cones.setMatrixAt(ti * 2, mt);
        mt.compose(ps.set(x, h + s * 3.4, z), qt, sc.set(1.25 * s, 2.7 * s, 1.25 * s)); cones.setMatrixAt(ti * 2 + 1, mt);
        col.setHex(0x3f7f3a).offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.12);
        cones.setColorAt(ti * 2, col); cones.setColorAt(ti * 2 + 1, col);
        ti++;
      }
    }
    trunks.count = ti; cones.count = ti * 2; rocks.count = ri;
    for (const im of [cones, trunks, rocks]) { im.castShadow = false; im.receiveShadow = false; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; root.add(im); }
    // a lighthouse on the western headland
    const m = new Merger();
    const lp = track.at(track.wrap(S + Math.round(track.n * 0.62)), 34, mk());
    for (let k = 0; k < 6; k++) m.cyl(k % 2 ? "red" : "white", lp.x, lp.y - 0.4 + 2.4 + k * 4.2, lp.z, 3.2 - k * 0.25, 4.2);
    m.cyl("steelDark", lp.x, lp.y + 26.4, lp.z, 2.6, 0.6);
    m.cyl("glass", lp.x, lp.y + 27.6, lp.z, 1.7, 2.0);
    m.add(UNIT.cone, "red", lp.x, lp.y + 29.6, lp.z, 0, 2.3, 2.0, 2.3);
    m.sphere("lamp", lp.x, lp.y + 27.6, lp.z, 1.1);
    m.build(M, root, true, false);
  }

  // ── update ──
  const flagM = new THREE.Matrix4(), flagR = new THREE.Matrix4(), flagT = new THREE.Matrix4().makeTranslation(1.2, 0, 0);
  const update = (time: number, dt: number, cam: THREE.Vector3) => {
    sky.position.copy(cam);
    for (const a of animated) a(time, dt);
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i]; c.position.x += dt * (1.2 + (i % 3) * 0.4); if (c.position.x > 1300) c.position.x = -1300;
    }
    for (const r of rotors) r.rotation.y += dt * (r.children.length > 1 && (r.children[0] as THREE.Mesh).scale.z > 5 ? 22 : 1.1);
    if (flagInst.mesh) {
      for (let k = 0; k < flagInst.base.length; k++) {
        flagR.makeRotationY(Math.sin(time * 3.2 + flagInst.phase[k]) * 0.35);
        flagM.copy(flagInst.base[k]).multiply(flagR).multiply(flagT);
        flagInst.mesh.setMatrixAt(k, flagM);
      }
      flagInst.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const b2 of cpBanners) if (b2.t > 0) { b2.t -= dt; if (b2.t <= 0) b2.mat.color.setHex(0xffffff); }
  };

  return {
    scene, sun, slots, cpIdx, heightAt, update,
    setStartLights(red: number, green: boolean) {
      for (let i = 0; i < 3; i++) startLamps[i].color.setHex(green ? 0x2dff6e : i < red ? 0xff2a2a : 0x3a0d0d);
    },
    flashCheckpoint(k: number) { const b2 = cpBanners[k]; if (b2) { b2.mat.color.setHex(0x9dffb0); b2.t = 0.7; } },
    followSun(x: number, z: number) {
      sun.target.position.set(Math.round(x), 0, Math.round(z));
      sun.position.set(Math.round(x) + sunOff.x, sunOff.y, Math.round(z) + sunOff.z);
      sun.target.updateMatrixWorld();
    },
    dispose() {
      disposeTree(scene);
      for (const l of startLamps) l.dispose();
      dot.dispose();
    },
  };
}
