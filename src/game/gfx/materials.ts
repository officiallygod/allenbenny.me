/* ================================================================
   gfx/materials.ts — shared, procedural, canvas-only material library.
   Zero downloads: every texture is painted on a <canvas> at runtime
   (256 px detail maps, 512 px max for the asphalt atlas). All maps use
   RepeatWrapping + SRGBColorSpace + max anisotropy from the renderer.
   Codes only against gfx/types.ts.
   ================================================================ */

import * as THREE from 'three';
import type { MaterialLibrary } from './types';

// convenience re-export — consumers can import the interface either
// from './types' (canonical) or from here alongside buildMaterials().
export type { MaterialLibrary };

/* ================================================================
   canvas helpers
   ================================================================ */

function makeCanvas(size: number): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  return { cv, ctx };
}

/** Paint `draw` over a solid `base` fill. */
function paintCanvas(
  base: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement {
  const { cv, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  draw(ctx, size);
  return cv;
}

function toTexture(
  cv: HTMLCanvasElement, maxAniso: number, repeatX = 1, repeatY = 1,
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

/** Deterministic RNG so texture generation is reproducible per session. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================================================================
   ground detail textures (legacy recipes, reused + upgraded)
   ================================================================ */

// SNOW — soft blotches of white / pale blue + faint sparkle
function snowCanvas(): HTMLCanvasElement {
  const rnd = mulberry32(101);
  const s = 256;
  return paintCanvas('#f4f8ff', s, (ctx, S) => {
    for (let i = 0; i < 90; i++) {
      const r = 12 + rnd() * 34;
      const g = ctx.createRadialGradient(
        rnd() * S, rnd() * S, 0, rnd() * S, rnd() * S, r);
      g.addColorStop(0, rnd() < .5 ? 'rgba(255,255,255,.10)' : 'rgba(205,222,245,.08)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = .1 + rnd() * .25;
      ctx.fillRect(rnd() * S, rnd() * S, 1, 1);
    }
    ctx.globalAlpha = 1;
  });
}

// SAND — fine grain + wavy ripple bands
function sandCanvas(): HTMLCanvasElement {
  const rnd = mulberry32(202);
  const s = 256;
  return paintCanvas('#e8d5a3', s, (ctx, S) => {
    for (let i = 0; i < 9000; i++) {
      const v = rnd() * .3 - .13;
      ctx.fillStyle =
        `rgba(${v > 0 ? 255 : 60},${v > 0 ? 240 : 45},${v > 0 ? 200 : 20},${Math.abs(v) * .8})`;
      ctx.fillRect(rnd() * S, rnd() * S, 1.4, 1.4);
    }
    for (let y = -S; y < S * 2; y += 14 + rnd() * 10) {
      ctx.strokeStyle = 'rgba(120,95,55,.07)';
      ctx.lineWidth = 2 + rnd() * 2;
      ctx.beginPath();
      for (let x = 0; x <= S; x += 8) {
        const yy = y + Math.sin(x * .05 + y * .3) * 4;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  });
}

// GRASS — dense turf: layered blade strokes + dry patches + clover specks
function grassCanvas(): HTMLCanvasElement {
  const rnd = mulberry32(303);
  const s = 256;
  return paintCanvas('#3f7a36', s, (ctx, S) => {
    /* LARGE soft tonal blotches (low-frequency only — fine noise shimmers
       into TV-static at driving distance) */
    for (let i = 0; i < 34; i++) {
      const g = 90 + rnd() * 50;
      ctx.fillStyle = `hsla(${95 + rnd() * 25},${30 + rnd() * 22}%,${g * .32}%,.13)`;
      ctx.beginPath();
      ctx.arc(rnd() * S, rnd() * S, 22 + rnd() * 52, 0, 7);
      ctx.fill();
    }
    /* blades — two coherent passes, moderate count, gentle uniform curve */
    for (let pass = 0; pass < 2; pass++) {
      const light = pass === 1;
      for (let i = 0; i < 2600; i++) {
        const h = 96 + rnd() * 44;
        ctx.strokeStyle = `hsla(${h},${(light ? 36 : 30) + rnd() * 20}%,${(light ? 27 : 16) + rnd() * (light ? 18 : 10)}%,${light ? .65 : .8})`;
        ctx.lineWidth = .8 + rnd() * (light ? 1 : .8);
        const x = rnd() * S, y = rnd() * S;
        const lean = (rnd() - .5) * 2.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + lean, y - 2 - rnd() * 2.5, x + lean * 1.5, y - 3 - rnd() * 4);
        ctx.stroke();
      }
    }
    /* sparse dry-grass accents */
    for (let i = 0; i < 380; i++) {
      ctx.strokeStyle = `hsla(${52 + rnd() * 18},${28 + rnd() * 22}%,${40 + rnd() * 14}%,.22)`;
      ctx.lineWidth = .7 + rnd() * .7;
      const x = rnd() * S, y = rnd() * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - .5) * 2.4, y - 2 - rnd() * 3);
      ctx.stroke();
    }
    /* clover / plantain specks */
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `hsla(${100 + rnd() * 20},45%,${30 + rnd() * 18}%,.42)`;
      ctx.beginPath();
      ctx.ellipse(rnd() * S, rnd() * S, 1.2 + rnd() * 1.8, 1 + rnd() * 1.4, rnd() * 3, 0, 7);
      ctx.fill();
    }
  });
}

// VOLCANIC ash — dark charcoal blotches + faint cracks
function ashCanvas(): HTMLCanvasElement {
  const rnd = mulberry32(404);
  const s = 256;
  return paintCanvas('#3a3038', s, (ctx, S) => {
    for (let i = 0; i < 70; i++) {
      const v = rnd() < .6;
      ctx.fillStyle = v
        ? `rgba(15,10,16,${.08 + rnd() * .12})`
        : `rgba(120,80,80,${.05 + rnd() * .08})`;
      ctx.beginPath();
      ctx.arc(rnd() * S, rnd() * S, 8 + rnd() * 30, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(10,7,12,.28)';
    for (let i = 0; i < 18; i++) {
      let x = rnd() * S, y = rnd() * S;
      ctx.lineWidth = .6 + rnd();
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - .5) * 34;
        y += (rnd() - .5) * 34;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

/* ================================================================
   ASPHALT — dark grey speckle + faded centre dashed line + solid edge
   lines baked into ONE texture. Dashes run along the V axis.
   CONSUMER CONTRACT: repeat must be set as (1, N) by whoever lays the
   road geometry — U spans full road width once (edge lines sit near
   u≈0.03 / u≈0.97), V repeats every N tiles along the road length
   (one dashed cycle ≈ one repeat). e.g. plane 11 m wide × 90 m long →
   tex.repeat.set(1, 12).
   ================================================================ */
function asphaltCanvas(): HTMLCanvasElement {
  const rnd = mulberry32(505);
  const S = 512;
  const { cv, ctx } = makeCanvas(S);
  ctx.fillStyle = '#2e2f33';
  ctx.fillRect(0, 0, S, S);

  // speckle: light + dark aggregate flecks
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    const l = v < .5 ? 38 + rnd() * 22 : 70 + rnd() * 40;
    ctx.fillStyle = `rgba(${l},${l},${l + 4},${.25 + rnd() * .5})`;
    ctx.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }

  // faint tyre-polish bands down the lane centres (u≈.35 and u≈.65)
  for (const u of [.35, .65]) {
    const g = ctx.createLinearGradient((u - .09) * S, 0, (u + .09) * S, 0);
    g.addColorStop(0, 'rgba(20,20,24,0)');
    g.addColorStop(.5, 'rgba(20,20,24,.16)');
    g.addColorStop(1, 'rgba(20,20,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect((u - .09) * S, 0, S * .18, S);
  }

  // centre dashes: faded white, run along V, centred u=.5
  ctx.fillStyle = 'rgba(230,228,215,.42)';
  const dashW = S * .016, dashH = S * .28;
  for (let y = S * .04; y < S; y += S * .56) {
    if (y + dashH > S) break;                 // keep exactly 2 dashes/tile
    ctx.globalAlpha = .55 + rnd() * .45;      // uneven wear per dash
    ctx.fillRect(S * .5 - dashW / 2, y, dashW, dashH);
  }
  ctx.globalAlpha = 1;

  // solid edge lines near u≈0.03 / 0.97
  ctx.fillStyle = 'rgba(235,232,220,.55)';
  ctx.fillRect(S * .03 - 2, 0, 4, S);
  ctx.fillRect(S * .97 - 2, 0, 4, S);

  // grime overlay so markings read worn, not painted-fresh
  ctx.fillStyle = 'rgba(46,47,51,.25)';
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * S, rnd() * S, 6 + rnd() * 22, 0, 7);
    ctx.fill();
  }
  return cv;
}

/* Water normal canvases — two offset ripple layers, scrolled against
   each other by updateTimeUniforms for a moving-interference look. */
function waterNormalCanvas(seed: number): HTMLCanvasElement {
  const rnd = mulberry32(seed);
  const S = 256;
  const { cv, ctx } = makeCanvas(S);
  // neutral tangent-space normal colour
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const wx = rnd() * S, wy = rnd() * S;
    const wl = 6 + rnd() * 14;
    ctx.strokeStyle = `rgba(255,255,255,${.05 + rnd() * .12})`;
    ctx.lineWidth = 1 + rnd();
    ctx.beginPath();
    ctx.moveTo(wx - wl / 2, wy);
    ctx.quadraticCurveTo(wx, wy - 2.5, wx + wl / 2, wy);
    ctx.stroke();
  }
  return cv;
}

/* ================================================================
   WIND SYSTEM
   Shared uniform object → one write per tick sways ALL grass/reeds/
   leaves/water surfaces at once. Bend is ∝ position.y above the root.
   customProgramCacheKey per param set is REQUIRED: onBeforeCompile
   closures share the same toString(), so three.js would otherwise
   cache ONE program and only the first-compiled amp/freq/speed
   would actually apply (legacy GameApp pitfall, kept fixed).
   ================================================================ */

const windUniforms = { uTime: { value: 0 } };

function windify(mat: THREE.Material, amp: number, freq: number, speed: number): void {
  mat.customProgramCacheKey = () => `wind-${amp}-${freq}-${speed}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.x += sin(position.x * ${freq.toFixed(2)} + uTime * ${speed.toFixed(2)}) * ${amp.toFixed(3)} * position.y;
       transformed.z += cos(position.z * ${(freq * .8).toFixed(2)} + uTime * ${(speed * .7).toFixed(2)}) * ${amp.toFixed(3)} * position.y;`,
    );
  };
}

/** Advance shared wind/water time uniforms — call once per frame. */
export function updateTimeUniforms(t: number): void {
  windUniforms.uTime.value = t;
}

/* ================================================================
   buildMaterials — create the whole library ONCE against a renderer
   (needed for max anisotropy). Textures are procedural; nothing to
   dispose per-frame. Call again only if you swap renderers.
   ================================================================ */

export function buildMaterials(renderer: THREE.WebGLRenderer): MaterialLibrary {
  const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

  /* ---- ground: legacy recipes reused + bumpMap upgrade ---- */
  const groundCvs = [snowCanvas(), sandCanvas(), grassCanvas(), ashCanvas()];
  const ground = groundCvs.map((cv, biome) => {
    // ONE texture shared by map + bumpMap: consumer repeat changes stay in
    // sync, and luminance doubles as height detail (subtle — .35 scale).
    const tex = toTexture(cv, MAX_ANISO);
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: biome === 3,
      map: tex,
      bumpMap: tex,
      bumpScale: .35,
    });
    return m;
  });

  /* ---- asphalt: single baked atlas, consumer repeats (1, N) ---- */
  const asphaltTex = toTexture(asphaltCanvas(), MAX_ANISO);
  const asphalt = new THREE.MeshStandardMaterial({
    color: 0xffffff,           // texture carries the tone
    map: asphaltTex,
    bumpMap: asphaltTex,       // same texture → repeat stays in sync
    bumpScale: .18,
    roughness: .92,            // dry asphalt
    metalness: 0,
  });

  /* ---- jeep ---- */
  const jeepPaint = new THREE.MeshPhysicalMaterial({
    color: 0xc62828,           // deep red
    metalness: .6,
    roughness: .38,
    clearcoat: 1,
    clearcoatRoughness: .12,
    envMapIntensity: 1.2,      // fed by buildEnvironment PMREM
  });
  const jeepDark = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: .85, metalness: .15 });
  const jeepGlass = new THREE.MeshPhysicalMaterial({
    color: 0xaad4e8,
    transparent: true,
    opacity: .55,
    roughness: .08,
    metalness: .25,
    envMapIntensity: 1.4,
  });
  const tire = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: .95, metalness: 0 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xd32f2f, emissiveIntensity: .3, roughness: .45, metalness: .55 });

  const headlightOn = new THREE.MeshStandardMaterial({
    color: 0xffb300, emissive: 0xffb300, emissiveIntensity: 3,  // bloom-fed amber
  });
  const taillightOn = new THREE.MeshStandardMaterial({
    color: 0xff2e88, emissive: 0xff2e88, emissiveIntensity: 2.5, // bloom-fed red/pink
  });

  /* ---- props: legacy M-object names/colors, PBR-tuned ---- */
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5e4128, roughness: .92, metalness: 0 });
  const pineSnow = new THREE.MeshStandardMaterial({ color: 0x35604b, roughness: .9, metalness: 0 });
  const pineGreen = new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: .9, metalness: 0 });
  const pineDark = new THREE.MeshStandardMaterial({ color: 0x243d30, roughness: .93, metalness: 0 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xfdfeff, roughness: .82, metalness: 0 });
  const rockGray = new THREE.MeshStandardMaterial({ color: 0x82898f, roughness: .96, metalness: .05 });
  const rockVolc = new THREE.MeshStandardMaterial({ color: 0x46333d, roughness: .97, metalness: .05 });
  const cactus = new THREE.MeshStandardMaterial({ color: 0x43804a, roughness: .85, metalness: 0 });
  const deadBush = new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: .98, metalness: 0 });
  const lava = new THREE.MeshBasicMaterial({ color: 0xff5a1f }); // bloom-fed via postfx

  const pickupFuel = new THREE.MeshStandardMaterial({ color: 0x35c24a, emissive: 0x1c8a2e, emissiveIntensity: .7, roughness: .3, metalness: .15 });
  const pickupCoin = new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0xb08800, emissiveIntensity: .55, metalness: .85, roughness: .22 });
  const pickupCrate = new THREE.MeshStandardMaterial({ color: 0xffae00, emissive: 0x7a5200, emissiveIntensity: .5, metalness: .45, roughness: .35 });

/* ---- foliage: wind-swayed via shared uTime ---- */
/* Realistic blades: canvas-painted tapered silhouette w/ dark-root →
   light-tip gradient + streaks, alphaTest cutout (no sorting issues).
   Canvas top = blade tip (flipY makes it land at v=1 = quad top). */
function bladeCanvas(rootCol: string, midCol: string, tipCol: string, seed: number): HTMLCanvasElement {
  const rnd = mulberry32(seed);
  const S = 128;
  const { cv, ctx } = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  const grad = ctx.createLinearGradient(0, S, 0, 0);
  grad.addColorStop(0, rootCol);
  grad.addColorStop(.55, midCol);
  grad.addColorStop(1, tipCol);
  ctx.fillStyle = grad;
  /* tapered blade: wide root → thin tip, gentle S-curve */
  ctx.beginPath();
  ctx.moveTo(S * .5 - S * .09, S);
  ctx.quadraticCurveTo(S * .5 - S * .13, S * .5, S * .5 - S * .02, S * .04);
  ctx.quadraticCurveTo(S * .5 + S * .03, S * .55, S * .5 + S * .1, S);
  ctx.closePath();
  ctx.fill();
  /* longitudinal streaks for fibre detail */
  ctx.globalAlpha = .18;
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = rnd() < .5 ? 'rgba(20,40,12,.8)' : 'rgba(220,255,180,.7)';
    ctx.lineWidth = 1 + rnd();
    const x0 = S * (.42 + rnd() * .16);
    ctx.beginPath();
    ctx.moveTo(x0, S);
    ctx.quadraticCurveTo(x0 + (rnd() - .5) * 14, S * .5, x0 + (rnd() - .5) * 8, S * .08);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return cv;
}
function bladeMaterial(root: string, mid: string, tip: string, seed: number, aniso: number): THREE.MeshStandardMaterial {
  const t = new THREE.CanvasTexture(bladeCanvas(root, mid, tip, seed));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return new THREE.MeshStandardMaterial({
    map: t,
    alphaTest: .4,
    side: THREE.DoubleSide,
    roughness: .88,
    metalness: 0,
  });
}
const grassBladeA = bladeMaterial('#2f5426', '#4f8a3c', '#a4d36e', 909, MAX_ANISO);
const grassBladeB = bladeMaterial('#355e2b', '#58984a', '#b7e07c', 910, MAX_ANISO);
const reed = bladeMaterial('#4a5c22', '#7d9642', '#c9d98a', 911, MAX_ANISO);
const treeLeaf = new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: .9, side: THREE.DoubleSide });
const treeLeafSnow = new THREE.MeshStandardMaterial({ color: 0x35604b, roughness: .9, side: THREE.DoubleSide });
  windify(grassBladeA, .08, 1.3, 2);
  windify(grassBladeB, .09, 1.5, 2.3);
  windify(reed, .07, 1.1, 1.8);
  windify(treeLeaf, .06, .5, 1.5);
  windify(treeLeafSnow, .05, .5, 1.4);

  /* ---- water: folio-2025 look — thin reflective surface skin over the bed.
     Dual scrolling normal layers + fresnel-ish opacity via envMapIntensity;
     transparent so the sand shelf reads through the shallows. ---- */
  const normalMapA = toTexture(waterNormalCanvas(707), MAX_ANISO, 4, 4);
  const normalMapB = toTexture(waterNormalCanvas(808), MAX_ANISO, 7, 7); // offset scale+seed → interference
  const water = new THREE.MeshPhysicalMaterial({
    color: 0x1c7fae,           // tropical shallow-sea blue
    transparent: true,
    opacity: .58,              // thin skin — you see the bed through it
    roughness: .045,
    metalness: 0,
    normalMap: normalMapA,
    normalScale: new THREE.Vector2(.55, .55),
    envMapIntensity: 3.2,      // strong sky/PMREM reflections carry the look
    side: THREE.DoubleSide,    // visible from below when wading
  });
  // second ripple layer scrolled the OPPOSITE way by updateTimeUniforms;
  // combined in-shader with layer A for moving-interference normals.
  water.customProgramCacheKey = () => 'water-dual-scroll';
  water.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uNormB = { value: normalMapB };
    shader.fragmentShader =
      'uniform float uTime;\nuniform sampler2D uNormB;\n' +
      shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         {
           vec2 uvA = vNormalMapUv + vec2(uTime * 0.013, uTime * 0.010);
           vec2 uvB = vNormalMapUv * vec2(7.0 / 4.0) + vec2(uTime * 0.021, -uTime * 0.017);
           vec3 nB = texture2D(uNormB, uvB).xyz * 2.0 - 1.0;
           vec3 nA = texture2D(normalMap, uvA).xyz * 2.0 - 1.0;
           vec3 nAvg = normalize(vec3(nA.xy + nB.xy, nA.z));
           normal = normalize(tbn * nAvg);
         }`,
      );
    /* DEPTH-TINTED water — analytic: the ocean is a FLAT plane, so its own
       height says nothing about depth. We rebuild the square-island mask in
       the shader (identical constants to terrain.ts): distance outside the
       land square drives shallow-turquoise → deep-navy, and the opacity
       thickens with depth so the bed shows through near the beach only. */
    shader.vertexShader =
      'varying vec3 vWPos;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 _wp = modelMatrix * vec4(position, 1.0);
         vWPos = _wp.xyz;`,
      );
    shader.fragmentShader =
      'varying vec3 vWPos;\n' +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           vec2 d = max(abs(vWPos.xz) - 380.0, vec2(0.0));
           float out1 = length(d);                       // metres off the island
           float depth01 = clamp(out1 / 78.0, 0.0, 1.0); // full deep at +78 m
           depth01 *= depth01 * (3.0 - 2.0 * depth01);   // smooth
           diffuseColor.rgb = mix(vec3(0.22, 0.62, 0.72), vec3(0.03, 0.15, 0.32), depth01);
           diffuseColor.a *= mix(0.40, 0.96, depth01);   // see the sand near shore
         }`,
      );
  };

  /* ponds & rivers: richer, more opaque blue than the ocean skin so inland
     water reads DEEP and blue even where the bed is only ~1 m down */
  const pond = new THREE.MeshPhysicalMaterial({
    color: 0x0e5f9e,
    transparent: true,
    opacity: .88,
    roughness: .05,
    metalness: 0,
    normalMap: normalMapA,
    normalScale: new THREE.Vector2(.5, .5),
    envMapIntensity: 2.6,
  });
  pond.customProgramCacheKey = () => 'pond-scroll';
  pond.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.fragmentShader =
      'uniform float uTime;\n' +
      shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         {
           vec2 uvA = vNormalMapUv + vec2(uTime * 0.02, uTime * 0.014);
           vec3 nA = texture2D(normalMap, uvA).xyz * 2.0 - 1.0;
           normal = normalize(tbn * nA);
         }`,
      );
  };

  return {
    ground,
    asphalt,
    pond,
    jeepPaint,
    jeepDark,
    jeepGlass,
    tire,
    rim,
    headlightOn,
    taillightOn,
    trunk,
    pineSnow,
    pineGreen,
    pineDark,
    cap,
    rockGray,
    rockVolc,
    cactus,
    deadBush,
    lava,
    pickupFuel,
    pickupCoin,
    pickupCrate,
    grassBladeA,
    grassBladeB,
    reed,
    treeLeaf,
    treeLeafSnow,
    water,
  };
}
