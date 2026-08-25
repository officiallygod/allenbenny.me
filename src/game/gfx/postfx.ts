import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { IS_MOBILE } from './types';
import type { PostFX } from './types';

/* ================================================================
   gfx/postfx.ts — GTAV-grade post chain
   RenderPass → UnrealBloom (subtle, desktop only) → Cinematic
   ShaderPass (filmic vignette + animated grain + saturation lift)
   → OutputPass (ACES tone map + sRGB from renderer settings).
   MSAA: samples=4 desktop / 0 mobile via explicit render target.
   ================================================================ */

/* ---------------- inline GLSL: cinematic grade pass ---------------- */
const CinematicShader = {
  name: 'CinematicShader',

  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    /** vignette softness exponent */
    uVigPow: { value: 2.4 },
    /** vignette strength (1 = fully dark corners) */
    uVigStrength: { value: 0.42 },
    /** grain amplitude — ultra-subtle */
    uGrainAmount: { value: 0.035 },
    /** saturation lift multiplier (>1 lifts) */
    uSaturation: { value: 1.07 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVigPow;
    uniform float uVigStrength;
    uniform float uGrainAmount;
    uniform float uSaturation;
    varying vec2 vUv;

    // deterministic hash noise for film grain
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);

      // ---- filmic vignette: radial falloff from screen centre ----
      float d = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.85, 0.28, d * uVigPow);   // 1 at centre → 0 at corners
      vec3 col = src.rgb * mix(1.0 - uVigStrength, 1.0, vig);

      // ---- ultra-subtle animated film grain ----
      float g = hash(vUv + fract(uTime) * 37.2);
      col += (g - 0.5) * uGrainAmount;

      // ---- slight saturation lift ----
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = clamp(mix(vec3(luma), col, uSaturation), 0.0, 1.0);

      gl_FragColor = vec4(col, src.a);
    }
  `,
};

export function buildPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostFX {
  // OutputPass reads tone mapping + color space off the renderer at render
  // time, so ACES must be set BEFORE the composer/passes are constructed.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // Compatibility-first target: many Windows/ANGLE GPUs silently fail
  // on HalfFloat + MSAA render targets (black output, zero errors).
  // Plain RGBA8 + no explicit MSAA renders everywhere; FXAA-free aliasing
  // is masked by the film grain + high pixelRatio.
  const rt = new THREE.WebGLRenderTarget(
    Math.max(1, Math.floor(renderer.domElement.width)),
    Math.max(1, Math.floor(renderer.domElement.height)),
    {
      type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace,
    },
  );

  const composer = new EffectComposer(renderer, rt);

  const renderPass = new RenderPass(scene, camera);

  // bloom entirely off on mobile
  const bloom = IS_MOBILE
    ? null
    : new UnrealBloomPass(
        new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
        0.35, // strength — subtle glow on emissives (lights, sun)
        0.4,  // radius
        0.85, // threshold — only bright emissive pixels feed bloom
      );
  if (bloom) composer.addPass(bloom);

  const cinematic = new ShaderPass(CinematicShader);
  composer.addPass(cinematic);

  const output = new OutputPass();
  composer.addPass(output); // last pass renders to screen

  return {
    composer,
    setSize(w, h) {
      composer.setSize(w, h);
    },
    render(dt) {
      // advance grain animation
      cinematic.uniforms.uTime.value += dt;
      composer.render(dt);
    },
    setBloomEnabled(on) {
      if (!bloom) return; // no-op on mobile (no bloom pass exists)
      bloom.enabled = on;
    },
    dispose() {
      renderPass.dispose?.();
      bloom?.dispose();
      cinematic.dispose();
      output.dispose();
      composer.dispose();
      rt.dispose(); // explicit MSAA target is not managed by composer.dispose()
    },
  };
}

export type { PostFX } from './types';
