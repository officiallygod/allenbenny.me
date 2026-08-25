/* ================================================================
   gfx/terrain.ts — road network + big-amplitude terrain heightfield
   Owned by the terrain agent. Codes ONLY against ./types.ts and
   ./noise.ts (same deterministic formulas the old GameApp.tsx used).

   ── SINGLE SOURCE OF TRUTH ─────────────────────────────────────
   terrainH(x, z) is THE one height field for BOTH rendering and
   PHYSICS. Chunk meshes displace vertices with it, the jeep ray/
   wheel queries sample it, prop placement plants on it. Nothing
   anywhere else may re-implement or approximate ground height —
   visuals and physics can never disagree about the world shape.
   All functions here are allocation-free (numbers only; vector
   writes go through the caller-supplied `out`) and fully
   deterministic (hash-based noise, zero Math.random, zero Date).

   Road corridors: terrain is smoothly flattened onto a gently
   rolling centreline height (low-freq fbm sampled along each
   road's own parameter). Past the asphalt the return to wild
   terrain is spread over a wide feather zone (see terrainH):
   the shoulder band stays essentially flat and the remaining
   height gap eases out over ~55 m — no cliffs, no kinks
   (both blend knots are C0+C1 by construction).
   ================================================================ */

import type { Vector3 } from 'three';
import { fbm, valueNoise, ROAD_HALF_WIDTH, ROAD_SHOULDER } from './noise';

export { ROAD_HALF_WIDTH, ROAD_SHOULDER };   // re-export: one public surface

const RING_RADIUS = 260;   // ring road mean radius (m)
const RING_WOBBLE = 8;     // ± sinusoidal wobble (m)
const RING_LOBES = 5;      // wobble cycles per revolution
// diagonal A: z = 140·sin(x·0.008) + 60   (slope dz/dx ≤ 1.12)
const DIAG_A_AMP = 140;
const DIAG_A_FREQ = 0.008;
const DIAG_A_OFF = 60;
// diagonal B: x = −120·sin(z·0.007) − 70  (slope dx/dz ≤ 0.84)
const DIAG_B_AMP = 120;
const DIAG_B_FREQ = 0.007;
const DIAG_B_OFF = 70;

/* ================================================================
   ROAD NETWORK DISTANCE
   Five centrelines: N-S (x=0), E-W (z=0), wobbly ring r≈260,
   and two sine diagonals. Returns distance in metres to the
   nearest centreline (finite everywhere; small = on a road).
   Curved roads divide by √(1+slope²) so distance is measured
   perpendicular to the local tangent, not vertically.
   ================================================================ */
export function roadDist(x: number, z: number): number {
  // N-S straight: x = 0
  const dNS = x < 0 ? -x : x;
  // E-W straight: z = 0
  const dEW = z < 0 ? -z : z;
  // ring: r(θ) = 260 + 8·sin(5θ); planar distance to the wobbling circle
  const theta = Math.atan2(z, x);
  const ringR = RING_RADIUS + RING_WOBBLE * Math.sin(theta * RING_LOBES);
  const dRing = Math.abs(Math.sqrt(x * x + z * z) - ringR);
  // diagonal A: z = f(x)
  const ax = x * DIAG_A_FREQ;
  const dA =
    Math.abs(z - (DIAG_A_AMP * Math.sin(ax) + DIAG_A_OFF)) /
    Math.sqrt(1 + DIAG_A_AMP * DIAG_A_FREQ * Math.cos(ax) *
      (DIAG_A_AMP * DIAG_A_FREQ * Math.cos(ax)));
  // diagonal B: x = g(z)
  const bz = z * DIAG_B_FREQ;
  const dB =
    Math.abs(x - (-DIAG_B_AMP * Math.sin(bz) - DIAG_B_OFF)) /
    Math.sqrt(1 + DIAG_B_AMP * DIAG_B_FREQ * Math.cos(bz) *
      (DIAG_B_AMP * DIAG_B_FREQ * Math.cos(bz)));
  let d = dNS < dEW ? dNS : dEW;
  if (dRing < d) d = dRing;
  if (dA < d) d = dA;
  if (dB < d) d = dB;
  return d;
}

/** true when the position sits on drivable asphalt */
export function onRoad(x: number, z: number): boolean {
  return roadDist(x, z) < ROAD_HALF_WIDTH;
}

/* ================================================================
   ROAD CENTRELINE HEIGHT
   Each road gently rolls along its own parameter (low-frequency
   fbm), so driving feels alive without ever making the asphalt
   bank or kink. Where roads meet, the heights are blended with
   inverse-square distance weights — smooth through every
   intersection, no seams.
   ================================================================ */
const ROAD_ROLL_AMP = 1.25; // ±m along every centreline

function roadHeightAt(x: number, z: number): number {
  const theta = Math.atan2(z, x);
  // periodic parameter for the ring: sample noise on a small circle
  const ringU = Math.cos(theta) * 11.3;
  const ringV = Math.sin(theta) * 11.3;

  const dNS = x < 0 ? -x : x;
  const dEW = z < 0 ? -z : z;
  const ringR = RING_RADIUS + RING_WOBBLE * Math.sin(theta * RING_LOBES);
  const dRing = Math.abs(Math.sqrt(x * x + z * z) - ringR);
  const dA = Math.abs(z - (DIAG_A_AMP * Math.sin(x * DIAG_A_FREQ) + DIAG_A_OFF));
  const dB = Math.abs(x - (-DIAG_B_AMP * Math.sin(z * DIAG_B_FREQ) - DIAG_B_OFF));

  // inverse-square distance weighting (ε=0.75 keeps it finite)
  let wsum = 0, hsum = 0;
  let w = 1 / ((dNS + 0.75) * (dNS + 0.75));
  wsum += w; hsum += w * ((fbm(z * 0.01, 3.7, 2) - 0.5) * 2 * ROAD_ROLL_AMP);
  w = 1 / ((dEW + 0.75) * (dEW + 0.75));
  wsum += w; hsum += w * ((fbm(x * 0.01, 71.3, 2) - 0.5) * 2 * ROAD_ROLL_AMP);
  w = 1 / ((dRing + 0.75) * (dRing + 0.75));
  wsum += w; hsum += w * ((fbm(ringU, ringV, 2) - 0.5) * 2 * ROAD_ROLL_AMP);
  w = 1 / ((dA + 0.75) * (dA + 0.75));
  wsum += w; hsum += w * ((fbm(x * 0.01, 157.1, 2) - 0.5) * 2 * ROAD_ROLL_AMP);
  w = 1 / ((dB + 0.75) * (dB + 0.75));
  wsum += w; hsum += w * ((fbm(z * 0.01, 211.7, 2) - 0.5) * 2 * ROAD_ROLL_AMP);
  return hsum / wsum;
}

/* ================================================================
   TERRAIN HEIGHT FIELD
   Wild terrain away from roads:
     • big rolling hills        (fbm − .5) · HILL_AMP
     • ridged detail octave     abs-based crest, ±1.5 m @ 0.02 freq
     • micro relief             valueNoise ±0.35 m @ 0.15 freq
   Near roads everything damps toward the centreline height:
     • shoulder band: micro-relief keeps flowing, only ~0.5% of
       the road↔wild gap closes here (band stays flat, < 0.15 m)
     • feather zone (+SHOULDER … +55 m): remaining gap eases to
       full wild terrain via smoothstep — slope ≈ wild hills
   ================================================================ */
const HILL_FREQ = 0.008;
const HILL_AMP = 25; // fbm span ≈ ±0.47 ⇒ measured peaks ≈ +8 / −11 m

function terrainRaw(x: number, z: number): number {
  // big hills
  let h = (fbm(x * HILL_FREQ, z * HILL_FREQ, 4) - 0.5) * HILL_AMP;
  // ridged detail octave (abs-based ridge, sharpened by squaring)
  const rn = valueNoise(x * 0.02, z * 0.02);
  const ridge = 1 - Math.abs(rn * 2 - 1);       // 0..1, crests at 1
  h += (ridge * ridge - 0.5) * 3;               // ±1.5 m
  // micro relief
  h += (valueNoise(x * 0.15, z * 0.15) - 0.5) * 0.7; // ±0.35 m
  return h;
}

/**
 * Ground height at (x, z) — THE single source of truth for
 * rendering AND physics (see header comment).
 *
 * Blend profile (two smoothsteps, matched C0+C1 at both knots):
 *   d ≤ HALF_WIDTH            → pure centreline height (flat asphalt)
 *   HALF_WIDTH … +SHOULDER    → shoulder band, essentially flat
 *                               (only 0.5% of the gap closes here)
 *   +SHOULDER … +FEATHER      → remaining gap eases back to wild terrain
 * Spreading the road↔wild height change over ~57 m keeps every
 * roadside slope gentler than the wild hills themselves — no
 * retaining walls.
 */
const SHOULDER_CUT = 0.005; // 0.5% of the gap closed inside the shoulder: across-band
                            // variation stays < 0.15 m even at worst-case ~13 m gap
const FEATHER = 55;         // metres past the shoulder until terrain is fully wild;
                            // worst feather slope ≈ 1.5·gap/55 ≈ 0.35 m/m (≈ wild hills)

export function terrainH(x: number, z: number): number {
  const d = roadDist(x, z);
  const outer = ROAD_HALF_WIDTH + ROAD_SHOULDER;
  if (d >= outer + FEATHER) return terrainRaw(x, z);
  const rh = roadHeightAt(x, z);
  if (d <= ROAD_HALF_WIDTH) return rh;
  const gap = terrainRaw(x, z) - rh;
  if (d < outer) {
    const u = (d - ROAD_HALF_WIDTH) / ROAD_SHOULDER; // 0..1 across shoulder
    return rh + gap * (u * u * (3 - 2 * u)) * SHOULDER_CUT;
  }
  const v = (d - outer) / FEATHER;                   // 0..1 across feather
  const s = v * v * (3 - 2 * v);
  return rh + gap * (SHOULDER_CUT + (1 - SHOULDER_CUT) * s);
}

/** finite-difference surface normal, written into `out` (allocation-free) */
export function terrainNormalInto(out: Vector3, x: number, z: number, e = 0.9): void {
  const hl = terrainH(x - e, z);
  const hr = terrainH(x + e, z);
  const hd = terrainH(x, z - e);
  const hu = terrainH(x, z + e);
  out.set(hl - hr, 2 * e, hd - hu).normalize();
}

/* ================================================================
   BIOMES — huge slow fbm blobs (×0.0016, offsets kept identical
   to the legacy GameApp implementation so the minimap, spawn
   logic and chunk materials all agree).
   ================================================================ */
/** 0=SNOW 1=DESERT 2=MEADOW 3=VOLCANIC */
export function biomeAt(x: number, z: number): number {
  const n = fbm(x * 0.0016 + 100, z * 0.0016 - 50, 3);
  return Math.min(3, Math.floor(n * 4));
}

export const BIOME_NAMES: readonly string[] = ['SNOW', 'DESERT', 'MEADOW', 'VOLCANIC'];

/** per-biome tinting: fog/sky hexes from legacy BIOMES table, mini = minimap fill */
export const BIOME_TINTS: readonly {
  fog: number; skyDay: number; skyNight: number; mini: string;
}[] = [
  { fog: 0xdfe9f2, skyDay: 0xbfd6ea, skyNight: 0x1a2534, mini: '#eef3f8' }, // SNOW
  { fog: 0xf0dcae, skyDay: 0xf7dfae, skyNight: 0x241c2e, mini: '#e8c88a' }, // DESERT
  { fog: 0xa8dba0, skyDay: 0xa5d8ff, skyNight: 0x18233a, mini: '#6aa84f' }, // MEADOW
  { fog: 0x4a3540, skyDay: 0x5a4050, skyNight: 0x140d14, mini: '#4a3540' }, // VOLCANIC
];
