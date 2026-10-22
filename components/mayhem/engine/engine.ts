import * as THREE from "three";
import { Track } from "./track";
import { buildWorld, type World, type Quality, CP_COUNT } from "./world";
import { RACERS, buildRacer, type Vis } from "./cars";
import type { Selfie } from "./selfie";
import { makeCar, placeCar, stepCar, wallsAndHeight, collideCars, emptyInput, type Car } from "./vehicle";
import { driveAi, makeAi } from "./ai";
import { initProgress, updateProgress, rank, LAPS } from "./race";
import { Particles, Skids } from "./fx";
import { MayhemAudio } from "./audio";
import { Controls } from "./input";
import { clamp, damp, lerp, smoothstep, wrapAngle } from "./util";

/* The game itself, with no React in it. It builds the island and the four cars, runs the race on
   a fixed 60 Hz step (so the race plays the same on a 60 Hz and a 144 Hz screen), draws with
   Three.js, and tells the interface what is happening through `events`. */

export type Phase = "attract" | "select" | "intro" | "countdown" | "racing" | "finished";

export interface HudData {
  speed: number; lap: number; laps: number; place: number; cars: number; time: number; lapTime: number; best: number;
  cp: number; cpCount: number; finished: boolean;
  map: { x: number; z: number; id: number; human: boolean }[];
}
export interface Standing { name: string; title: string; place: number; time: number | null; human: boolean; best: number | null }
export interface Results { place: number; time: number; best: number; laps: number[]; standings: Standing[] }
export interface EngineEvents {
  phase(p: Phase): void;
  countdown(n: number): void;
  hud(d: HudData): void;
  checkpoint(k: number, total: number): void;
  lap(no: number, time: number, best: boolean): void;
  results(r: Results): void;
  driver(name: string, title: string): void;
  paused(p: boolean): void;
  error(msg: string): void;
}
export interface EngineOptions { muted: boolean; reduced: boolean; test: boolean }

const STEP = 1 / 60;
const COUNT_STEP = 0.95;
const INTRO_LEN = 7.0;
const SPEED_UNITS = 4;           // metres-per-second to the "km/h" on the speedometer

export class MayhemEngine {
  readonly track = new Track();
  private renderer!: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(62, 1, 0.5, 2600);
  private world!: World;
  private cars: Car[] = [];
  private player!: Car;
  private slots: { x: number; z: number; y: number; h: number }[] = [];
  private fx!: Particles;
  private skids!: Skids;
  readonly audio: MayhemAudio;
  readonly controls = new Controls();

  phase: Phase = "attract";
  paused = false;
  private racerIdx = 0;
  private selfie: Selfie | null = null;
  private time = 0;
  private phaseTime = 0;
  private raceTime = 0;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private lastCount = -1;
  private hudTimer = 0;
  private finishedAt = -1;
  private resultsSent = false;
  private autopilot = false;
  private disposed = false;
  private pixelRatio = 1;
  private maxRatio = 1.75;
  private frameAvg = 16;
  private frames = 0;
  private lowQ = false;
  private lastDriver = "";
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camHeading = 0;
  private camInit = false;
  private spinAcc: number[] = [];
  private hitSeen: number[] = [];
  private resizeObs: ResizeObserver | null = null;
  private tmpV = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement, private events: EngineEvents, private opts: EngineOptions) {
    this.audio = new MayhemAudio(opts.muted);
  }

  // ── set up ──
  init() {
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const weak = (navigator.hardwareConcurrency || 4) <= 4;
    this.lowQ = coarse || weak;
    const quality: Quality = { low: this.lowQ, shadow: this.lowQ ? 512 : 1024, trees: this.lowQ ? 170 : 380 };
    this.maxRatio = this.lowQ ? 1.4 : 1.75;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxRatio);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.lowQ, powerPreference: "high-performance", alpha: false });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.canvas.addEventListener("webglcontextlost", this.onLost);

    this.world = buildWorld(this.track, quality);
    this.slots = this.world.slots;
    this.fx = new Particles(this.lowQ ? 220 : 420);
    this.skids = new Skids(this.lowQ ? 700 : 1600);
    this.world.scene.add(this.fx.points, this.skids.mesh);

    RACERS.forEach((spec, i) => {
      const rig = buildRacer(spec);
      this.world.scene.add(rig.root);
      const car = makeCar(i, spec, false, rig);
      car.ai = makeAi(1000 + i * 77);
      this.cars.push(car);
      this.spinAcc.push(0); this.hitSeen.push(0);
    });
    this.player = this.cars[0];
    this.player.human = true;
    this.assign(0);
    this.layoutGrid();

    this.resize();
    if (typeof ResizeObserver !== "undefined" && this.canvas.parentElement) {
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.canvas.parentElement);
    }
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.controls.attach();
    this.controls.onPause = () => this.togglePause();
    this.controls.onRestart = () => { if (this.phase === "racing" || this.phase === "finished" || this.phase === "countdown") this.restart(); };
    if (this.opts.test) (window as unknown as { __mayhem?: unknown }).__mayhem = this;

    this.setPhase("attract");
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.events.error("The graphics were interrupted. Please reload the page to play again.");
    this.running = false;
  };
  private onVisibility = () => {
    if (document.hidden) { if (this.phase === "racing" || this.phase === "countdown") this.setPaused(true); }
    else this.last = performance.now();
  };
  private resize = () => {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  // ── which racer is the player ──
  private assign(idx: number) {
    this.racerIdx = idx;
    this.cars.forEach((c, i) => { c.human = i === idx; });
    this.player = this.cars[idx];
    this.applyFace();
  }
  /** Your photo goes on whoever you are driving as; the other three keep their own faces */
  private applyFace() { for (const c of this.cars) c.rig.setFace(c.human ? this.selfie : null); }
  setSelfie(s: Selfie | null) { this.selfie = s; this.applyFace(); }
  get hasSelfie() { return !!this.selfie; }
  setRacer(idx: number) {
    this.assign(clamp(idx, 0, RACERS.length - 1));
    this.layoutGrid();
  }
  get racer() { return this.racerIdx; }

  /** put every car on the grid; the player starts third */
  private layoutGrid() {
    const others = this.cars.filter((c) => c !== this.player);
    const order = [others[0], others[1], this.player, others[2]];
    order.forEach((c, s) => {
      const sl = this.slots[s];
      placeCar(c, sl.x, sl.z, sl.y, sl.h, this.track);
      c.input = emptyInput();
      initProgress(c, this.track);
      c.place = s + 1;
      this.spinAcc[c.id] = 0; this.hitSeen[c.id] = 0;
      c.rig.root.position.set(sl.x, sl.y, sl.z);
      c.rig.root.rotation.y = sl.h;
    });
    this.raceTime = 0; this.finishedAt = -1; this.resultsSent = false;
    this.fx.clear(); this.skids.clear();
    this.world.setStartLights(0, false);
  }

  // ── phases ──
  private setPhase(p: Phase) {
    this.phase = p; this.phaseTime = 0;
    this.controls.setActive(p === "racing" || p === "countdown");
    this.events.phase(p);
  }
  showTitle() { this.layoutGrid(); this.setPhase("attract"); this.camInit = false; this.setPaused(false); this.audio.idle(); }
  showSelect() { this.layoutGrid(); this.setPhase("select"); }

  /** Start the race: the cinematic first (unless the player prefers reduced motion), then the countdown */
  startRace(skipIntro = false) {
    this.audio.start();
    this.layoutGrid();
    this.setPaused(false);
    if (skipIntro || this.opts.reduced) this.beginCountdown();
    else { this.setPhase("intro"); this.lastDriver = ""; }
  }
  skipIntro() { if (this.phase === "intro") this.beginCountdown(); }
  restart() { this.layoutGrid(); this.setPaused(false); this.beginCountdown(); }

  private beginCountdown() {
    this.layoutGrid();
    this.camInit = false;
    this.lastCount = -1;
    this.setPhase("countdown");
  }
  private beginRace() {
    this.world.setStartLights(0, true);
    this.audio.beep(true);
    this.events.countdown(0);
    this.setPhase("racing");
  }

  setPaused(p: boolean) {
    if (this.paused === p) return;
    this.paused = p;
    if (p) { this.audio.suspend(); this.controls.releaseAll(); } else { this.audio.resume(); this.last = performance.now(); }
    this.events.paused(p);
  }
  togglePause() { if (this.phase === "racing" || this.phase === "countdown") this.setPaused(!this.paused); }

  // ── the loop ──
  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    if (!this.running) return;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.watchFrameTime(dt);
    if (!this.paused) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) { this.simStep(STEP); this.acc -= STEP; n++; }
      if (n === 5) this.acc = 0;           // too slow to keep up: drop the backlog rather than spiral
      this.time += dt; this.phaseTime += dt;
      this.fx.update(dt);
    }
    this.drawFrame(this.paused ? 0 : dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.08; this.emitHud(); }
  };

  /** Lower the resolution if the screen cannot keep up, raise it again if there is room */
  private watchFrameTime(dt: number) {
    if (this.paused || dt <= 0) return;
    this.frameAvg = lerp(this.frameAvg, dt * 1000, 0.05);
    if (++this.frames % 45 !== 0) return;
    let r = this.pixelRatio;
    if (this.frameAvg > 24 && r > 0.7) r = Math.max(0.7, r - 0.15);
    else if (this.frameAvg < 13 && r < Math.min(this.maxRatio, window.devicePixelRatio || 1)) r = Math.min(this.maxRatio, r + 0.1);
    if (r !== this.pixelRatio) { this.pixelRatio = r; this.renderer.setPixelRatio(r); this.resize(); }
  }

  private simStep(dt: number) {
    const ph = this.phase;
    if (ph === "countdown") {
      const t = this.phaseTime + 0.0001;
      const n = 3 - Math.floor(t / COUNT_STEP);
      if (n !== this.lastCount && n >= 1) {
        this.lastCount = n;
        this.world.setStartLights(4 - n, false);
        this.audio.beep(false);
        this.events.countdown(n);
      }
      if (t >= COUNT_STEP * 3) this.beginRace();
      return;
    }
    if (ph !== "racing" && ph !== "finished") return;
    this.raceTime += dt;
    const track = this.track;
    const human = this.player;
    for (const c of this.cars) {
      if (c.human && !c.finished && !this.autopilot) this.controls.read(c.input);
      else driveAi(c, this.cars, track, dt, this.raceTime, human.total, this.raceTime > 0.1 + c.id * 0.06);
      stepCar(c, dt, track);
    }
    for (const c of this.cars) wallsAndHeight(c, track);
    collideCars(this.cars);
    for (const c of this.cars) wallsAndHeight(c, track);
    for (const c of this.cars) {
      updateProgress(c, track, this.raceTime, {
        checkpoint: (car, k) => { if (car === this.player) { this.world.flashCheckpoint(k); this.audio.checkpoint(); this.events.checkpoint(k + 1, CP_COUNT); } },
        lap: (car, t, no, best) => { if (car === this.player) { this.audio.lap(); this.events.lap(no, t, best); } },
        finish: (car) => { if (car === this.player) this.playerFinished(); },
      });
    }
    rank(this.cars);
    this.effects(dt);
    for (const c of this.cars) {
      this.spinAcc[c.id] += c.spin;
      if (c.hit > 0 && c.human) { this.audio.thump(c.hit); }
      c.hit = 0;
    }
    if (ph === "finished") this.maybeSendResults();
  }

  private playerFinished() {
    this.audio.finish();
    this.setPhase("finished");
    this.finishedAt = this.time;
    const p = this.player;
    const gate = this.track.at(this.track.startIdx, 0);
    for (let i = 0; i < (this.lowQ ? 70 : 140); i++) {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      const cols = [[1, 0.35, 0.12], [1, 0.82, 0.25], [0.23, 0.63, 1], [0.95, 0.95, 0.9], [0.22, 0.78, 0.47], [0.9, 0.29, 0.56]];
      const c = cols[(Math.random() * cols.length) | 0];
      this.fx.emit(p.x + (Math.random() - 0.5) * 6, gate.y + 6 + Math.random() * 4, p.z + (Math.random() - 0.5) * 6, Math.cos(a) * s * 0.6, 4 + Math.random() * 7, Math.sin(a) * s * 0.6, 0.45 + Math.random() * 0.35, 3.4, c[0], c[1], c[2], 0, 9, 1);
    }
  }

  private maybeSendResults() {
    if (this.resultsSent) return;
    const allDone = this.cars.every((c) => c.finished);
    if (this.time - this.finishedAt < 2.6 && !allDone) return;
    if (this.time - this.finishedAt < 1.6) return;
    this.resultsSent = true;
    const order = rank(this.cars);
    const p = this.player;
    this.events.results({
      place: p.place,
      time: p.finishTime,
      best: p.bestLap,
      laps: [...p.lapTimes],
      standings: order.map((c) => ({ name: c.spec.name, title: c.spec.title, place: c.place, time: c.finished ? c.finishTime : null, human: c.human, best: isFinite(c.bestLap) ? c.bestLap : null })),
    });
  }

  /** tyre smoke, skid marks, sparks */
  private effects(dt: number) {
    for (const c of this.cars) {
      const sp = Math.abs(c.speed);
      const sliding = (c.slide > 0.38 && sp > 9) || (c.input.handbrake && sp > 10) || (c.input.brake > 0 && c.speed > 22 && sp > 12 && c.slide > 0.2);
      const hx = Math.cos(c.h), hz = -Math.sin(c.h);      // across the car (to the left)
      const fx = Math.sin(c.h), fz = Math.cos(c.h);
      for (const sd of [-1, 1]) {
        const wx = c.x + fx * -1.4 + hx * sd * 1.1, wz = c.z + fz * -1.4 + hz * sd * 1.1;
        const key = c.id * 2 + (sd > 0 ? 1 : 0);
        if (sliding) {
          this.skids.mark(key, wx, c.y, wz, hx * 0.2, hz * 0.2);
          if (Math.random() < 0.7) this.fx.emit(wx, c.y + 0.35, wz, (Math.random() - 0.5) * 1.4 - fx * 1.5, 1.0 + Math.random() * 0.8, (Math.random() - 0.5) * 1.4 - fz * 1.5, 1.1 + Math.random() * 0.7, 0.9, 0.9, 0.9, 0.92, 2.4, -0.3, 0.45);
        } else this.skids.lift(key);
      }
      // a little dust on a launch
      if (c.input.throttle > 0 && sp < 7 && c.speed > 0.5 && Math.random() < 0.35) {
        this.fx.emit(c.x - fx * 2.3 + (Math.random() - 0.5) * 1.6, c.y + 0.3, c.z - fz * 2.3 + (Math.random() - 0.5) * 1.6, -fx * 2, 0.7, -fz * 2, 0.9, 0.7, 0.85, 0.82, 0.75, 2, -0.2, 0.3);
      }
      // sparks when something hit hard
      if (c.hit > 0.3) {
        for (let i = 0; i < 8; i++) this.fx.emit(c.x + fx * 1.4, c.y + 0.8, c.z + fz * 1.4, (Math.random() - 0.5) * 9, 2 + Math.random() * 5, (Math.random() - 0.5) * 9, 0.3, 0.45, 1, 0.82, 0.3, -0.3, 14, 1);
      }
    }
    void dt;
  }

  // ── drawing ──
  private drawFrame(dt: number) {
    const alpha = this.paused ? 1 : clamp(this.acc / STEP, 0, 1);
    const attract = this.phase === "attract" || this.phase === "select" || this.phase === "intro" || this.phase === "countdown";
    for (const c of this.cars) {
      const x = lerp(c.px, c.x, alpha), z = lerp(c.pz, c.z, alpha), y = lerp(c.py, c.y, alpha);
      const h = c.ph + wrapAngle(c.h - c.ph) * alpha;
      c.rig.root.position.set(x, y, z);
      c.rig.root.rotation.y = h;
      const maxS = c.spec.phys.maxSpeed;
      const vis: Vis = {
        speed: c.speed, speedNorm: clamp(Math.abs(c.speed) / maxS, 0, 1), accel: attract ? 0 : c.accel, lateral: attract ? 0 : c.latAccel,
        steer: c.steer, throttle: c.input.throttle, brake: c.input.brake, impact: c.impact,
        celebrate: this.phase === "finished" && (c.finished || c.human) ? 1 : 0, pitch: -Math.atan(c.slope), time: this.time + c.id * 1.7,
      };
      if (attract) { vis.throttle = 0.2; vis.speedNorm = 0.15; vis.speed = 0; }
      const spin = this.spinAcc[c.id]; this.spinAcc[c.id] = 0;
      c.rig.animate(vis, Math.max(dt, 0.0001), spin, c.steer);
    }
    this.updateCamera(dt, alpha);
    this.camera.updateMatrixWorld();
    this.world.update(this.time, dt, this.camera.position);
    this.world.followSun(this.camPos.x + (this.camLook.x - this.camPos.x) * 0.35, this.camPos.z + (this.camLook.z - this.camPos.z) * 0.35);
    this.fx.setScale(this.renderer.domElement.height, this.camera);
    // the engine sound follows the player's car
    const p = this.player;
    if (this.phase === "racing" || this.phase === "finished") this.audio.engine(clamp(Math.abs(p.speed) / p.spec.phys.maxSpeed, 0, 1), p.input.throttle, p.slide, !this.paused);
    else this.audio.engine(0.05, this.phase === "countdown" ? 0.8 : 0.1, 0, this.phase === "countdown" && !this.paused);
    this.renderer.render(this.world.scene, this.camera);
  }

  /** A portrait of the driver, taken at the finish: the face (yours, if you added it) in front of the
      car, with the result written across the bottom. Rendered at its own size and put straight back, so
      the picture on screen never changes. Returns a JPEG, or null if the browser would not make one. */
  photo(info: { place: string; time: string; name: string }): Promise<Blob | null> {
    const r = this.renderer, cam = this.camera, p = this.player;
    const W = 1080, H = 1350;
    const size = r.getSize(new THREE.Vector2());
    const pr = r.getPixelRatio();
    const keep = { fov: cam.fov, aspect: cam.aspect, pos: cam.position.clone(), quat: cam.quaternion.clone() };
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    try {
      p.rig.root.updateMatrixWorld(true);
      const hp = p.rig.head.getWorldPosition(new THREE.Vector3());
      const fx = Math.sin(p.h), fz = Math.cos(p.h), sx = Math.cos(p.h), sz = -Math.sin(p.h);
      r.setPixelRatio(1); r.setSize(W, H, false);
      cam.aspect = W / H; cam.fov = 33; cam.updateProjectionMatrix();
      cam.position.set(hp.x + fx * 7.4 + sx * 0.7, hp.y + 0.2, hp.z + fz * 7.4 + sz * 0.7);
      cam.lookAt(hp.x, hp.y - 0.95, hp.z);
      cam.updateMatrixWorld();
      this.fx.setScale(H, cam);
      r.render(this.world.scene, cam);
      const g = out.getContext("2d")!;
      g.drawImage(r.domElement, 0, 0, W, H);
      // the result, written across the bottom
      const band = g.createLinearGradient(0, H * 0.7, 0, H);
      band.addColorStop(0, "rgba(10,12,16,0)"); band.addColorStop(0.55, "rgba(10,12,16,0.78)"); band.addColorStop(1, "rgba(10,12,16,0.92)");
      g.fillStyle = band; g.fillRect(0, H * 0.7, W, H * 0.3);
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.fillStyle = "#ffd23f"; g.font = "900 54px Helvetica, Arial, sans-serif";
      g.fillText("MINI MAYHEM", 64, H - 205);
      g.fillStyle = "#ffffff"; g.font = "900 150px Helvetica, Arial, sans-serif";
      g.fillText(info.place, 60, H - 70);
      g.textAlign = "right";
      g.font = "800 58px Helvetica, Arial, sans-serif"; g.fillStyle = "#ffffff";
      g.fillText(info.time, W - 64, H - 118);
      g.font = "700 34px Helvetica, Arial, sans-serif"; g.fillStyle = "rgba(255,255,255,0.78)";
      g.fillText(`${info.name}  /  3 LAPS`, W - 64, H - 70);
      g.textAlign = "center"; g.font = "600 26px Helvetica, Arial, sans-serif"; g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillText(`${location.host}/mini-mayhem`, W / 2, H - 22);
    } catch (e) {
      console.error(e);
      return Promise.resolve(null);
    } finally {
      r.setPixelRatio(pr); r.setSize(size.x, size.y, false);
      cam.fov = keep.fov; cam.aspect = keep.aspect; cam.position.copy(keep.pos); cam.quaternion.copy(keep.quat);
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      this.fx.setScale(r.domElement.height, cam);
      r.render(this.world.scene, cam);   // resizing cleared the picture: put it straight back
    }
    return new Promise((res) => out.toBlob((b) => res(b), "image/jpeg", 0.92));
  }

  // ── cameras ──
  private chase(c: Car, dt: number, alpha: number, snap = false) {
    const x = lerp(c.px, c.x, alpha), z = lerp(c.pz, c.z, alpha), y = lerp(c.py, c.y, alpha);
    const sp = Math.abs(c.speed), sn = clamp(sp / c.spec.phys.maxSpeed, 0, 1);
    let want = c.h;
    if (sp > 6 && c.speed > 0) want = c.h + wrapAngle(Math.atan2(c.vx, c.vz) - c.h) * 0.35;   // lean towards where the car is really going
    if (snap || !this.camInit) { this.camHeading = want; }
    this.camHeading += wrapAngle(want - this.camHeading) * (1 - Math.exp(-4.2 * dt));
    const fx = Math.sin(this.camHeading), fz = Math.cos(this.camHeading);
    const dist = 9.0 + sn * 2.4, height = 4.2 + sn * 0.9;
    const px = x - fx * dist, pz = z - fz * dist;
    let py = y + height;
    py = Math.max(py, this.world.heightAt(px, pz) + 1.6);
    const lookAhead = 6.5 + sp * 0.16;
    const lx = x + fx * lookAhead, lz = z + fz * lookAhead, ly = y + 2.2;
    if (snap || !this.camInit) {
      this.camPos.set(px, py, pz); this.camLook.set(lx, ly, lz); this.camInit = true;
    } else {
      this.camPos.x = damp(this.camPos.x, px, 8, dt); this.camPos.z = damp(this.camPos.z, pz, 8, dt); this.camPos.y = damp(this.camPos.y, py, 5, dt);
      this.camLook.x = damp(this.camLook.x, lx, 9, dt); this.camLook.y = damp(this.camLook.y, ly, 7, dt); this.camLook.z = damp(this.camLook.z, lz, 9, dt);
    }
    this.camPos.y = Math.max(this.camPos.y, this.world.heightAt(this.camPos.x, this.camPos.z) + 1.4);
    const fovWant = 62 + (this.opts.reduced ? 3 : 15) * sn;
    this.camera.fov = damp(this.camera.fov, fovWant, 3, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(dt: number, alpha: number) {
    const S = this.slots;
    const f = { x: Math.sin(S[0].h), z: Math.cos(S[0].h) };       // along the road
    const r = { x: -Math.cos(S[0].h), z: Math.sin(S[0].h) };      // to the right
    const gx = (S[0].x + S[1].x + S[2].x + S[3].x) / 4, gz = (S[0].z + S[1].z + S[2].z + S[3].z) / 4, gy = S[0].y;
    const ph = this.phase, t = this.phaseTime;
    const dtc = Math.max(dt, 1 / 120);
    const setCam = (px: number, py: number, pz: number, lx: number, ly: number, lz: number, fov = 56) => {
      this.camPos.set(px, py, pz); this.camLook.set(lx, ly, lz); this.camera.fov = fov; this.camera.updateProjectionMatrix();
    };
    if (ph === "attract") {
      // behind the grid, swaying gently from side to side, looking down the straight at the gantry and the base
      const sway = Math.sin(this.time * 0.22) * 15;
      setCam(gx - f.x * 30 + r.x * sway, gy + 9.5 + Math.sin(this.time * 0.3) * 1.2, gz - f.z * 30 + r.z * sway, gx + f.x * 10, gy + 2.2, gz + f.z * 10, 52);
      this.camInit = false;
    } else if (ph === "select") {
      // the chosen car from the front, high enough in the frame to clear the cards underneath
      const c = this.player;
      const a = c.h + 0.6 + Math.sin(this.time * 0.4) * 0.35;
      setCam(c.x + Math.sin(a) * 12.5, c.y + 2.6, c.z + Math.cos(a) * 12.5, c.x, c.y - 0.2, c.z, 42);
      this.camInit = false;
    } else if (ph === "intro") {
      const k = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);
      const p = this.player;
      if (t < 2.7) {
        const u = smoothstep(0, 1, k(t, 0, 2.7));
        setCam(gx - f.x * lerp(78, 26, u) + r.x * lerp(24, 10, u), gy + lerp(36, 8, u), gz - f.z * lerp(78, 26, u) + r.z * lerp(24, 10, u), gx + f.x * 8, gy + 1.5, gz + f.z * 8, 54);
      } else if (t < 5.5) {
        const u = smoothstep(0, 1, k(t, 2.7, 5.5));
        const side = lerp(15, -15, u), tgt = lerp(9, -9, u);
        setCam(gx + f.x * 21 + r.x * side, gy + 3.4, gz + f.z * 21 + r.z * side, gx - f.x * 3 + r.x * tgt, gy + 3.0, gz - f.z * 3 + r.z * tgt, 34);
        let best = this.cars[0], bd = 1e9;
        const tx = gx - f.x * 3 + r.x * tgt, tz = gz - f.z * 3 + r.z * tgt;
        for (const c of this.cars) { const d = (c.x - tx) ** 2 + (c.z - tz) ** 2; if (d < bd) { bd = d; best = c; } }
        if (best.spec.id !== this.lastDriver) { this.lastDriver = best.spec.id; this.events.driver(best.spec.name, best.spec.title); }
      } else {
        const u = smoothstep(0, 1, k(t, 5.5, INTRO_LEN));
        const endPos = this.tmpV.set(p.x - Math.sin(p.h) * 9, p.y + 4.2, p.z - Math.cos(p.h) * 9);
        const sx = gx + f.x * 21 + r.x * -15, sz = gz + f.z * 21 + r.z * -15;
        const bump = Math.sin(u * Math.PI);   // swing wide of the cars rather than through them
        const px = lerp(sx, endPos.x, u) - r.x * bump * 9, pz = lerp(sz, endPos.z, u) - r.z * bump * 9, py = lerp(gy + 3.4, endPos.y, u) + bump * 3.5;
        const tx = lerp(gx - f.x * 3 + r.x * -9, p.x + Math.sin(p.h) * 6.5, u), tz = lerp(gz - f.z * 3 + r.z * -9, p.z + Math.cos(p.h) * 6.5, u);
        setCam(px, py, pz, tx, lerp(gy + 3.0, p.y + 2.2, u), tz, lerp(34, 62, u));
        if (this.phaseTime >= INTRO_LEN) { this.camInit = false; this.beginCountdown(); }
      }
    } else if (ph === "finished") {
      const c = this.player;
      const a = this.time * 0.9;
      const x = lerp(c.px, c.x, alpha), z = lerp(c.pz, c.z, alpha);
      const tx = this.camLook.x, tz = this.camLook.z;
      void tx; void tz;
      setCam(x + Math.cos(a) * 11, c.y + 4.2, z + Math.sin(a) * 11, x, c.y + 2.4, z, 54);
    } else {
      this.chase(this.player, dtc, alpha, !this.camInit);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  skipIntroOnTap() { this.skipIntro(); }

  // ── what the interface needs ──
  private emitHud() {
    const p = this.player;
    const raceOn = this.phase === "racing" || this.phase === "finished";
    this.events.hud({
      speed: Math.round(Math.abs(p.speed) * SPEED_UNITS),
      lap: Math.min(LAPS, p.lap + 1), laps: LAPS, place: p.place, cars: this.cars.length,
      time: raceOn ? (p.finished ? p.finishTime : this.raceTime) : 0,
      lapTime: raceOn && p.started ? (p.finished ? p.lapTimes[p.lapTimes.length - 1] ?? 0 : this.raceTime - p.lapStart) : 0,
      best: isFinite(p.bestLap) ? p.bestLap : -1,
      cp: p.cp, cpCount: CP_COUNT, finished: p.finished,
      map: this.cars.map((c) => ({ x: c.x, z: c.z, id: c.id, human: c.human })),
    });
  }
  get trackSamples() { return this.track; }

  // ── for tests ──
  debugState() {
    return {
      phase: this.phase, paused: this.paused, raceTime: this.raceTime, racer: this.racerIdx, pixelRatio: this.pixelRatio,
      cars: this.cars.map((c) => ({ name: c.spec.name, human: c.human, x: c.x, z: c.z, h: c.h, speed: c.speed, lap: c.lap, cp: c.cp, total: c.total, place: c.place, finished: c.finished, finishTime: c.finishTime, bestLap: c.bestLap, lapTimes: c.lapTimes, d: c.proj.d, impact: c.impact })),
    };
  }
  debugSimulate(seconds: number) { const n = Math.round(seconds / STEP); for (let i = 0; i < n; i++) { this.simStep(STEP); this.time += STEP; this.phaseTime += STEP; } }
  debugAutopilot(on: boolean) { this.autopilot = on; }
  debugSetPhase(p: Phase, t = 0) { this.setPhase(p); this.phaseTime = t; }
  debugMeshReport() { const out: { tris: number; key: string }[] = []; this.world.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry) { const g = m.geometry; const n = g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3; out.push({ tris: Math.round(n), key: (m.material as THREE.MeshLambertMaterial).color?.getHexString?.() ?? m.type }); } }); return out.sort((a, b) => b.tris - a.tris).slice(0, 12); }
  debugGo() { this.layoutGrid(); this.setPhase("racing"); this.world.setStartLights(0, true); }
  debugDrawStats() { const i = this.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures }; }

  // ── shutting down ──
  dispose() {
    this.disposed = true; this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.controls.detach();
    this.audio.dispose();
    for (const c of this.cars) c.rig.dispose();
    this.fx?.dispose(); this.skids?.dispose();
    this.world?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    const w = window as unknown as { __mayhem?: unknown };
    if (w.__mayhem === this) delete w.__mayhem;
  }
}
