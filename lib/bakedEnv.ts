import * as THREE from "three";

/* The avatar's studio environment, pre-baked by scripts/bake-env.mjs.

   Building it at runtime (PMREMGenerator.fromScene) compiles a GGX importance-sampling
   shader, which blocks the main thread for 1-2s on a cold GPU shader cache. The bake
   stores the finished PMREM render target instead; here it is fetched, unpacked and wrapped
   in a DataTexture that three treats exactly like the generated one.

   Anything unexpected (file missing, another three revision, no DecompressionStream,
   corrupt data) resolves to null and the caller builds the environment at runtime as
   before, so a dependency upgrade can never break the avatar. */

/* Must match ENV_SIZE / SIGMA in scripts/bake-env.mjs. */
export const ENV_SIZE = 128;
export const ENV_SIGMA = 0.04;

export type BakedEnv = { data: Uint16Array; width: number; height: number };

const HEADER_BYTES = 16;

/* The file name carries the three revision it was baked with, so after an upgrade the old
   file is simply never requested (and a stale CDN copy can never be picked up). */
const bakedUrl = () => `/env/room-r${THREE.REVISION}-s${ENV_SIZE}.bin`;

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/* float32 -> float16 bit pattern, round to nearest. Inputs here are finite and below 65504. */
function toHalf(v: number): number {
  f32[0] = v;
  const x = u32[0];
  const e = ((x >>> 23) & 0xff) - 112; // re-bias 127 -> 15
  const m = x & 0x7fffff;
  if (e >= 31) return 0x7bff; // clamp to the largest finite half
  if (e <= 0) {
    if (e < -10) return 0;
    const shift = 14 - e;
    return ((m | 0x800000) + (1 << (shift - 1))) >> shift; // subnormal
  }
  return (e << 10) + ((m + 0x1000) >> 13); // a mantissa carry correctly bumps the exponent
}

async function inflate(res: Response): Promise<Uint8Array> {
  const stream = res.body!.pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function load(): Promise<BakedEnv | null> {
  if (typeof DecompressionStream === "undefined") return null;
  const res = await fetch(bakedUrl());
  if (!res.ok || !res.body) return null;
  const bytes = await inflate(res);

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const version = bytes[4];
  const revision = dv.getUint16(6, true);
  const size = dv.getUint16(8, true);
  const width = dv.getUint16(10, true);
  const height = dv.getUint16(12, true);
  if (
    magic !== "PMRE" ||
    version !== 1 ||
    revision !== Number(THREE.REVISION) ||
    size !== ENV_SIZE ||
    // The PMREM layout for this cube size; if three changes it, the bake is out of date.
    width !== 3 * Math.max(size, 16 * 7) ||
    height !== 4 * size ||
    bytes.length !== HEADER_BYTES + width * height * 4
  ) {
    return null;
  }

  // Undo the row-wise delta, then RGBE -> half-float RGBA (bottom row first, as GL expects).
  const px = bytes.subarray(HEADER_BYTES);
  const stride = width * 4;
  for (let i = stride; i < px.length; i++) px[i] = (px[i] + px[i - stride]) & 255;

  const data = new Uint16Array(width * height * 4);
  const ONE = toHalf(1);
  for (let i = 0; i < px.length; i += 4) {
    const e = px[i + 3];
    if (e !== 0) {
      const scale = 2 ** (e - 136); // 2^(e-128) / 256
      data[i] = toHalf(px[i] * scale);
      data[i + 1] = toHalf(px[i + 1] * scale);
      data[i + 2] = toHalf(px[i + 2] * scale);
    }
    data[i + 3] = ONE;
  }
  return { data, width, height };
}

let pending: Promise<BakedEnv | null> | null = null;

/* Starts fetching and unpacking the baked environment (once). Call it as early as possible,
   next to the model preload; it never rejects. */
export function preloadBakedEnv(): Promise<BakedEnv | null> {
  return (pending ??= load().catch(() => null));
}

/* A texture three accepts in place of a PMREMGenerator result. Same layout, filtering and
   colour space as the render target the generator would have produced. */
export function bakedEnvTexture({ data, width, height }: BakedEnv): THREE.DataTexture {
  const t = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mapping = THREE.CubeUVReflectionMapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.name = "PMREM.cubeUv.baked";
  t.needsUpdate = true;
  return t;
}
