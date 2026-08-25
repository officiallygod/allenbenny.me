/* ================================================================
   gfx/sky.ts — sky dome, lighting rig, PMREM environment.
   Implements the SkyDome / LightingRig / buildEnvironment contracts
   from types.ts. One draw call for the whole dome, no textures.
   ================================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SKY_VERT, SKY_FRAG } from './skyShaders';

/* ================================================================
   DAY_PRESETS — 4-key day cycle (day → dusk → night → dawn).
   Colours carried over from GameApp's originals; intensities tuned
   up for physically-based lights under ACES tonemapping.
   ================================================================ */
export interface DayPreset {
  name: string;
  light: number;
  lightI: number;
  hemiSky: number;
  hemiI: number;
  fogA: number;
  ambient: number;
}

export const DAY_PRESETS: ReadonlyArray<DayPreset> = [
  { name: 'day',   light: 0xffd2c2, lightI: 3.0, hemiSky: 0xcfe4ff, hemiI: 0.90, fogA: 0x9fd8ff, ambient: 0.25 },
  { name: 'dusk',  light: 0xff8181, lightI: 1.9, hemiSky: 0xffb9a0, hemiI: 0.65, fogA: 0xe89bb0, ambient: 0.18 },
  { name: 'night', light: 0x3240ff, lightI: 1.4, hemiSky: 0x27305c, hemiI: 0.40, fogA: 0x14204a, ambient: 0.12 },
  { name: 'dawn',  light: 0xffa882, lightI: 2.3, hemiSky: 0xffd8c2, hemiI: 0.75, fogA: 0xf8c8e8, ambient: 0.22 },
];

/** Preset shape accepted by LightingRig.applyPreset (mirrors types.ts). */
export interface PresetLike {
  light: number;
  lightI: number;
  hemiSky: number;
  hemiI: number;
  fogA: number;
  ambient: number;
}

/* ---------------- scratch objects — zero per-frame allocation ---------------- */
const _cLight = new THREE.Color();
const _cHemiSky = new THREE.Color();
const _cFog = new THREE.Color();
const _lerpTarget = new THREE.Color();

/* ================================================================
   buildSky — inverted BackSide sphere, ShaderMaterial gradient.
   The mesh keeps identity transform and is render-ordered first,
   so vDir = object-space position = world view direction.
   ================================================================ */
export interface SkyDome {
  mesh: THREE.Mesh;
  update(sunDir: THREE.Vector3, dayFactor: number, horizonTint: THREE.Color): void;
  dispose(): void;
}

export function buildSky(scene: THREE.Scene): SkyDome {
  const geo = new THREE.SphereGeometry(850, 32, 20);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.4, 0.6, -0.6).normalize() },
      uDayFactor: { value: 1 },
      uHorizonTint: { value: new THREE.Color(0x9fd8ff) },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;               // camera lives inside the dome
  mesh.renderOrder = -10;                   // draw before everything else
  mesh.matrixAutoUpdate = false;            // static at origin, identity transform
  scene.add(mesh);

  return {
    mesh,
    update(sunDir, dayFactor, horizonTint) {
      (mat.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir);
      mat.uniforms.uDayFactor.value = dayFactor;
      (mat.uniforms.uHorizonTint.value as THREE.Color).copy(horizonTint);
    },
    dispose() {
      scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    },
  };
}

/* ================================================================
   buildLighting — sun + hemisphere + ambient + cool fill.
   Tight ortho shadow box follows the target each frame.
   ================================================================ */
export interface LightingRig {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.HemisphereLight | THREE.AmbientLight;
  fill: THREE.DirectionalLight;
  applyPreset(
    p: PresetLike,
    tK: number,
    next: PresetLike & { name?: string },
  ): void;
  updateSun(target: THREE.Vector3, angle: number): void;
}

export function buildLighting(scene: THREE.Scene, shadowSize: number): LightingRig {
  /* ---- key light (sun) ---- */
  const sun = new THREE.DirectionalLight(0xffd2c2, DAY_PRESETS[0].lightI);
  sun.castShadow = true;
  const cam = sun.shadow.camera;
  cam.left = -58;
  cam.right = 58;
  cam.top = 58;
  cam.bottom = -58;
  cam.near = 1;
  cam.far = 260;
  cam.updateProjectionMatrix();
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.position.set(60, 110, -80);
  scene.add(sun);
  scene.add(sun.target);

  /* ---- hemisphere sky/ground bounce ---- */
  const hemi = new THREE.HemisphereLight(DAY_PRESETS[0].hemiSky, 0xe8e2d4, DAY_PRESETS[0].hemiI);
  scene.add(hemi);

  /* ---- flat ambient floor ---- */
  const ambient = new THREE.AmbientLight(0xffffff, DAY_PRESETS[0].ambient);
  scene.add(ambient);

  /* ---- faint cool fill from the opposite side of the sun ---- */
  const fill = new THREE.DirectionalLight(0xbfd4e8, 0.35);
  fill.position.set(-70, 45, 55);
  scene.add(fill);

  return {
    sun,
    hemi,
    ambient,
    fill,

    /** Lerp colours/intensities between preset p and next by tK∈[0,1]. */
    applyPreset(p, tK, next) {
      const k = tK < 0 ? 0 : tK > 1 ? 1 : tK;
      _cLight.setHex(p.light).lerp(_lerpTarget.setHex(next.light), k);
      sun.color.copy(_cLight);
      sun.intensity = p.lightI + (next.lightI - p.lightI) * k;

      _cHemiSky.setHex(p.hemiSky).lerp(_lerpTarget.setHex(next.hemiSky), k);
      hemi.color.copy(_cHemiSky);
      hemi.intensity = p.hemiI + (next.hemiI - p.hemiI) * k;

      ambient.intensity = p.ambient + (next.ambient - p.ambient) * k;

      _cFog.setHex(p.fogA).lerp(_lerpTarget.setHex(next.fogA), k);
      const fog = scene.fog as THREE.Fog | null;
      if (fog) fog.color.copy(_cFog);
    },

    /**
     * Place the sun on its arc around `target`; snap the tight shadow
     * frustum to follow. angle 0..2π sweeps a full day; the height
     * term keeps the light above the horizon whenever intensity matters.
     */
    updateSun(target, angle) {
      sun.position.set(
        Math.sin(angle) * 140,
        Math.max(30 + Math.sin(angle) * 110, 26),
        target.z - 60,
      );
      sun.target.position.copy(target);
      sun.target.updateMatrixWorld();
    },
  };
}

/* ================================================================
   buildEnvironment — PMREM of the stock RoomEnvironment addon.
   Tiny procedural room, zero downloads. Generator is disposed,
   the returned texture stays alive on scene.environment.
   ================================================================ */
export function buildEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): THREE.Texture | null {
  let tex: THREE.Texture | null = null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  try {
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    tex = pmrem.fromScene(room, 0.04).texture;
    room.dispose?.();
    scene.environment = tex;
  } finally {
    pmrem.dispose();
  }
  return tex;
}
