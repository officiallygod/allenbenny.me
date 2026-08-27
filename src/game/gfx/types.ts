/* ================================================================
   gfx/types.ts — shared INTERFACE contracts for the GTAV-grade
   graphics overhaul. TYPES ONLY (implementations live in the
   sibling modules); re-exports the shared world constants from
   ./noise so consumers can import everything from here.
   Owned by the orchestrator.
   ================================================================ */

/* runtime values (single source of truth = noise.ts) */
export {
  WORLD_HALF, CHUNK, SEG, VIEW_CHUNKS, IS_MOBILE,
  ROAD_HALF_WIDTH, ROAD_SHOULDER,
  hash2, valueNoise, fbm,
} from './noise';

import * as THREE from 'three';

/* ================================================================
   SHARED SHAPES
   ================================================================ */

/** 0=SNOW 1=DESERT 2=MEADOW 3=VOLCANIC */
export type BiomeIndex = 0 | 1 | 2 | 3;

export interface DayPreset {
  name: string;
  light: number; lightI: number;
  hemiSky: number; hemiI: number;
  fogA: number; ambient: number;
}

export interface ChunkObstacle { x: number; z: number; r: number }

export interface BuiltChunk {
  group: THREE.Group;
  cx: number; cz: number;
  obstacles: ChunkObstacle[];
  lakes: { x: number; z: number; r: number }[];
}

export interface ChunkBuildContext {
  mats: MaterialLibrary;
  pickups: { mesh: THREE.Object3D; kind: 'fuel' | 'coin' | 'crate' }[];
  lakeRects: { x: number; z: number; r: number }[];
  dummy: THREE.Object3D;
}

/* ================================================================
   MATERIALS  (implemented in materials.ts)
   ================================================================ */
export interface MaterialLibrary {
  ground: THREE.MeshStandardMaterial[];      // per biome 0..3
  asphalt: THREE.MeshStandardMaterial;       // lane markings baked in texture
  jeepPaint: THREE.MeshPhysicalMaterial;     // clearcoat red
  jeepDark: THREE.MeshStandardMaterial;
  jeepGlass: THREE.MeshPhysicalMaterial;
  tire: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
  headlightOn: THREE.MeshStandardMaterial;   // emissive amber (bloom-fed)
  taillightOn: THREE.MeshStandardMaterial;   // emissive red/pink
  trunk: THREE.MeshStandardMaterial;
  pineSnow: THREE.MeshStandardMaterial;
  pineGreen: THREE.MeshStandardMaterial;
  pineDark: THREE.MeshStandardMaterial;
  cap: THREE.MeshStandardMaterial;
  rockGray: THREE.MeshStandardMaterial;
  rockVolc: THREE.MeshStandardMaterial;
  cactus: THREE.MeshStandardMaterial;
  deadBush: THREE.MeshStandardMaterial;
  lava: THREE.MeshBasicMaterial;
  pickupFuel: THREE.MeshStandardMaterial;
  pickupCoin: THREE.MeshStandardMaterial;
  pickupCrate: THREE.MeshStandardMaterial;
  grassBladeA: THREE.Material;               // wind-swayed via uTime
  grassBladeB: THREE.Material;
  reed: THREE.Material;
  treeLeaf: THREE.MeshStandardMaterial;
  treeLeafSnow: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  pond: THREE.MeshPhysicalMaterial;
}

/* ================================================================
   SKY / LIGHTING  (implemented in sky.ts)
   ================================================================ */
export interface SkyDome {
  mesh: THREE.Mesh;
  /** sunDir normalized; dayFactor 0 night..1 noon; horizonTint = fog color */
  update(sunDir: THREE.Vector3, dayFactor: number, horizonTint: THREE.Color): void;
  dispose(): void;
}

export interface LightingRig {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight | THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
  applyPreset(p: DayPreset, tK: number, next: DayPreset): void;
  /** place sun on its arc around target; shadow frustum follows */
  updateSun(target: THREE.Vector3, angle: number): void;
}

/* ================================================================
   POSTFX  (implemented in postfx.ts)
   RenderPass → UnrealBloom(subtle) → cinematic grade → OutputPass
   ================================================================ */
export interface PostFX {
  composer: import('three/examples/jsm/postprocessing/EffectComposer.js').EffectComposer;
  setSize(w: number, h: number): void;
  render(dt: number): void;
  /** one-time: verify the chain produces non-dark output; false ⇒ use direct render */
  selfTest(): boolean;
  setBloomEnabled(on: boolean): void;
  dispose(): void;
}

/* ================================================================
   JEEP  (implemented in jeep.ts)
   ================================================================ */
export interface Jeep {
  group: THREE.Group;
  wheels: THREE.Mesh[];              // roll on rotation.x
  wheelContainers: THREE.Group[];    // steer on rotation.y (front two)
  headBeam: THREE.SpotLight;
  brakeLights: THREE.MeshStandardMaterial;  // pump emissiveIntensity on brake
  setSuspension(fl: number, fr: number, rl: number, rr: number): void;
  dispose(): void;
}

/* ================================================================
   CAMERA  (implemented in camera.ts)
   ================================================================ */
export type CamMode = 'chase' | 'hood' | 'far' | 'free';

export interface ChaseCam {
  camera: THREE.PerspectiveCamera;
  mode: CamMode;
  /** C-key / HUD cycling: chase → hood → far → free */
  cycleMode(): CamMode;
  /** free-orbit input (drag deltas, zoom wheel) */
  orbit(dyYaw: number, dyPitch: number): void;
  zoom(d: number): void;
  update(
    pos: THREE.Vector3,
    heading: number,
    speed01: number,
    dt: number,
    lateralDrift: number,
  ): void;
  resize(aspect: number): void;
}
