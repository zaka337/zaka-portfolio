import * as THREE from "three";

/* Facial expressions for the home head. The head is one scanned skin on a body skeleton with no face
   rig and no blendshapes, so they are made in the skin material's shader (like the squish in faceFx.ts):

     smile, frown, brow raise, brow furrow   push the mesh a few millimetres near the mouth corners,
                                             cheeks and brows; the painted lips and brows move with it
     blink (each eye on its own: a wink)     the eyelids are painted over the photo's eyes: skin taken
                                             from just above and below each eye closes in from both
                                             sides and a lash line is drawn where they meet

   Everything is driven by 6 numbers in two uniforms; the director that decides WHEN to blink or
   smile is components/face/life.ts. A weight of 0 costs nothing: the shader returns at once.

   The measurements are of Avatar.glb (picked from close-ups in the pose lab, see the memory note):
   positions are in the model's own rest space (what `position` is in the vertex shader), the eyes in
   texture space. NOTE the texture is rotated: "up" on the face is +u and "right" is +v. */

export interface FaceWeights {
  smile: number;    // mouth corners up and out, cheeks up
  frown: number;    // mouth corners down
  browUp: number;   // brows lifted (surprise)
  browDown: number; // brows lowered and drawn together (annoyed)
  blinkL: number;   // 0 open .. 1 closed (the viewer's left eye)
  blinkR: number;
  /** -1..1: which side of a smile is stronger (real smiles are never quite even) */
  asym: number;
}

export const NEUTRAL: FaceWeights = { smile: 0, frown: 0, browUp: 0, browDown: 0, blinkL: 0, blinkR: 0, asym: 0 };

const U = {
  uZkA: { value: new THREE.Vector4() }, // smile, frown, browUp, browDown
  uZkB: { value: new THREE.Vector4() }, // blinkL, blinkR, debug mask, asym
};

/** The one place the face is set from. Cheap: it writes two vectors. */
export function setFace(w: Partial<FaceWeights>) {
  const a = U.uZkA.value, b = U.uZkB.value;
  if (w.smile !== undefined) a.x = w.smile;
  if (w.frown !== undefined) a.y = w.frown;
  if (w.browUp !== undefined) a.z = w.browUp;
  if (w.browDown !== undefined) a.w = w.browDown;
  if (w.blinkL !== undefined) b.x = w.blinkL;
  if (w.blinkR !== undefined) b.y = w.blinkR;
  if (w.asym !== undefined) b.w = w.asym;
}
export function getFace(): FaceWeights {
  const a = U.uZkA.value, b = U.uZkB.value;
  return { smile: a.x, frown: a.y, browUp: a.z, browDown: a.w, blinkL: b.x, blinkR: b.y, asym: b.w };
}
/** For the lab: draw the eye masks in red so they can be lined up with the painted eyes */
export function debugMasks(on: boolean) { U.uZkB.value.z = on ? 1 : 0; }

/* ── where things are ── */
// eyes in texture space: c = centre (u, v), a = half width along v, b = half height along u, tilt in radians
const EYE_L = { c: [0.2825, 0.6065], a: 0.027, b: 0.0142, tilt: 0.0 };
const EYE_R = { c: [0.2657, 0.7522], a: 0.0332, b: 0.0147, tilt: 0.0 };
const f = (n: number) => n.toFixed(5);

const VERT_DECL = `
uniform vec4 uZkA;
uniform vec4 uZkB;
float zkG(vec3 p, vec3 c, float r) { vec3 d = (p - c) / r; return exp(-dot(d, d)); }
vec3 zkFace(vec3 p) {
  vec3 o = vec3(0.0);
  // mouth corners and cheeks, each side on its own so nothing cracks at the middle of the face
  float gmL = zkG(p, vec3(-0.0346, 0.7903, 0.0896), 0.022), gmR = zkG(p, vec3(0.0346, 0.7903, 0.0896), 0.022);
  float gcL = zkG(p, vec3(-0.0550, 0.8220, 0.0780), 0.032), gcR = zkG(p, vec3(0.0550, 0.8220, 0.0780), 0.032);
  float aL = 1.0 + uZkB.w * 0.25, aR = 1.0 - uZkB.w * 0.25;
  o += uZkA.x * (aL * (gmL * vec3(-0.0055, 0.0105, 0.0030) + gcL * vec3(-0.0030, 0.0070, 0.0015))
               + aR * (gmR * vec3(0.0055, 0.0105, 0.0030) + gcR * vec3(0.0030, 0.0070, 0.0015)));
  o += uZkA.y * (gmL * vec3(0.0020, -0.0085, 0.0) + gmR * vec3(-0.0020, -0.0085, 0.0));
  // brows: one soft blob each, lifted more at the inner end
  float gbL = zkG(p, vec3(-0.0380, 0.8850, 0.0905), 0.030), gbR = zkG(p, vec3(0.0380, 0.8850, 0.0905), 0.030);
  float inL = smoothstep(0.045, 0.012, abs(p.x)) ;
  o += uZkA.z * (gbL + gbR) * vec3(0.0, 0.0050 + 0.0035 * inL, 0.0008);
  o += uZkA.w * (gbL * vec3(0.0030 * inL, -0.0040 - 0.0020 * inL, 0.0) + gbR * vec3(-0.0030 * inL, -0.0040 - 0.0020 * inL, 0.0));
  return o;
}`;

const FRAG_DECL = `
uniform vec4 uZkB;
// One eye. p is the texture position, c the eye's centre (u, v), a and b its half sizes, bl how closed it is (0..1).
vec3 zkEye(vec3 col, vec2 uv, vec2 c, float a, float b, float tilt, float bl) {
  if (bl < 0.004) return col;
  vec2 d = uv - c;
  float cs = cos(tilt), sn = sin(tilt);
  float s = (d.y * cs + d.x * sn) / a;      // along the eye: +v, 1 is a corner
  float t = (-d.y * sn + d.x * cs) / b;     // up: +u, 1 is the top of the eye
  float e = (s / 1.45) * (s / 1.45) + (t / 2.0) * (t / 2.0);
  float m = 1.0 - smoothstep(0.50, 1.0, e);
  if (m <= 0.0) return col;
  float k = bl * bl * (3.0 - 2.0 * bl);
  // the edge of the upper lid comes down, the lower lid comes up a little, and they meet on a curve
  float closeLine = -0.12 + 0.30 * s * s;
  float upEdge = mix(1.7 - 0.3 * s * s, closeLine, k);
  float loEdge = mix(-1.7, closeLine, k);
  float up = smoothstep(-0.09, 0.09, t - upEdge);
  float lo = smoothstep(-0.09, 0.09, loEdge - t);
  float lid = max(up, lo);
  // skin from just above and just below the eye, at the same place along it
  vec3 skinUp = texture2D(map, vec2(c.x + b * 1.55, uv.y)).rgb;
  vec3 skinLo = texture2D(map, vec2(c.x - b * 2.4, uv.y)).rgb;
  vec3 cheek = texture2D(map, vec2(c.x - b * 3.6, uv.y)).rgb; // clean cheek skin, to lift the shadowed lid colour
  vec3 skin = mix(skinLo, mix(skinUp, skinLo, 0.3), step(closeLine, t));
  skin = mix(skin, cheek, 0.35);
  vec3 outc = mix(col, skin, lid);
  // the upper lid shades the eye just under it; a crease shows above a shut lid
  float shade = (1.0 - smoothstep(0.0, 0.55, upEdge - t)) * step(t, upEdge) * (1.0 - up);
  outc *= 1.0 - 0.22 * shade * smoothstep(0.02, 0.35, bl);
  float crease = (1.0 - smoothstep(0.0, 0.16, abs(t - (closeLine + 1.05)))) * smoothstep(0.5, 1.0, k) * (1.0 - smoothstep(0.7, 1.1, abs(s)));
  outc *= 1.0 - 0.16 * crease;
  // the lash line: a thin dark stroke on the edge of the upper lid, strongest when the eye is shut
  float lineW = 0.13;
  float line = (1.0 - smoothstep(0.0, lineW, abs(t - mix(upEdge, closeLine, step(0.999, k)) + 0.02))) * smoothstep(0.02, 0.2, bl) * (1.0 - smoothstep(0.75, 1.15, abs(s)));
  line *= 0.82 + 0.18 * sin(s * 11.0 + c.y * 400.0); // a lash line is not a ruled line
  outc = mix(outc, vec3(0.05, 0.032, 0.028), line * 0.72);
  return mix(col, outc, m);
}
vec3 zkLids(vec3 col, vec2 uv) {
  col = zkEye(col, uv, vec2(${f(EYE_L.c[0])}, ${f(EYE_L.c[1])}), ${f(EYE_L.a)}, ${f(EYE_L.b)}, ${f(EYE_L.tilt)}, uZkB.x);
  col = zkEye(col, uv, vec2(${f(EYE_R.c[0])}, ${f(EYE_R.c[1])}), ${f(EYE_R.a)}, ${f(EYE_R.b)}, ${f(EYE_R.tilt)}, uZkB.y);
  return col;
}`;

const DEBUG_FRAG = `
  if (uZkB.z > 0.5) {
    vec2 dl = vMapUv - vec2(${f(EYE_L.c[0])}, ${f(EYE_L.c[1])}); vec2 dr = vMapUv - vec2(${f(EYE_R.c[0])}, ${f(EYE_R.c[1])});
    float el = pow(dl.y / (${f(EYE_L.a)} * 1.45), 2.0) + pow(dl.x / (${f(EYE_L.b)} * 2.0), 2.0);
    float er = pow(dr.y / (${f(EYE_R.a)} * 1.45), 2.0) + pow(dr.x / (${f(EYE_R.b)} * 2.0), 2.0);
    if (abs(el - 1.0) < 0.05 || abs(er - 1.0) < 0.05) diffuseColor.rgb = vec3(1.0, 0.0, 0.0);
  }`;

/** Add the expressions to a SKIN material's shader (call from its onBeforeCompile). Hair and cap do not get this. */
export function patchExpressions(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) {
  shader.uniforms.uZkA = U.uZkA;
  shader.uniforms.uZkB = U.uZkB;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
    .replace("#include <begin_vertex>", `#include <begin_vertex>\nif (dot(uZkA, uZkA) > 1e-8) transformed += zkFace(position);`);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <map_pars_fragment>", `#include <map_pars_fragment>\n#ifdef USE_MAP\n${FRAG_DECL}\n#endif`)
    .replace("#include <map_fragment>", `#include <map_fragment>\n#ifdef USE_MAP\n  diffuseColor.rgb = zkLids(diffuseColor.rgb, vMapUv);\n  ${DEBUG_FRAG}\n#endif`);
}

export const EXPRESSION_CACHE_KEY = "zk-face-expr-1";
