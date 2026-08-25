/* ================================================================
   gfx/noise.ts — deterministic noise + world constants.
   PURE layer: no roads here (see ./terrain.ts), no THREE needed.
   ================================================================ */

/* ---------------- world constants ---------------- */
export const WORLD_HALF = 400;      // bounded map ±400 m
export const CHUNK = 90;            // metres per chunk side
export const SEG = 48;              // segments per chunk side
export const VIEW_CHUNKS = 4;       // radius in chunks (9x9 loaded)
export const IS_MOBILE =
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* road geometry constants live here so every module shares one def;
   the road NETWORK functions live in ./terrain.ts */
export const ROAD_HALF_WIDTH = 5.5; // asphalt half width (m)
export const ROAD_SHOULDER = 2;     // extra blend band (m)

/* ---------------- deterministic noise ---------------- */
/** Deterministic hash → [0,1). Same semantics as legacy GameApp hash2. */
export function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}
const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Bilinear value noise in [0,1]. */
export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/** Fractal Brownian motion, ~[0,1] (legacy semantics: no renormalization). */
export function fbm(x: number, y: number, oct = 4): number {
  let v = 0, amp = .5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * valueNoise(x * f, y * f);
    amp *= .5; f *= 2.03;
  }
  return v;
}
