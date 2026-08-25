/* ================================================================
   gfx/props.ts — prop factories returning Groups built from
   MODULE-LEVEL SHARED GEOMETRY (geoCache). Every repeated prop
   reuses one BufferGeometry; heavy users (chunks.ts) convert these
   groups to InstancedMesh. All transforms are deterministic via
   hash2 — zero Math.random anywhere.

   Codes ONLY against ./types.ts signatures + ./noise.ts.
   Materials come from the shared MaterialLibrary; anything the
   library does not carry (moss, road furniture paint, lamp glow)
   is created here as a local fallback — siblings stay untouched.

   CONTRACT: every factory returns a THREE.Group whose BASE sits
   at y=0 (consumer plants it with group.position.y = terrainH(...)).
   ================================================================ */

import * as THREE from 'three';
import type { MaterialLibrary } from './types';
import { hash2 } from './noise';

/* ================================================================
   SHARED GEOMETRY CACHE
   ================================================================ */

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Get-or-build a geometry under `key`. Never dispose these. */
function cached(key: string, maker: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = maker();
    geoCache.set(key, g);
  }
  return g;
}

/* ================================================================
   LOCAL FALLBACK MATERIALS (library gaps — created lazily, once)
   ================================================================ */

let _moss: THREE.MeshStandardMaterial | null = null;
function mossMat(): THREE.MeshStandardMaterial {
  if (!_moss) _moss = new THREE.MeshStandardMaterial({ color: 0x4f7038, roughness: 0.95 });
  return _moss;
}
let _pole: THREE.MeshStandardMaterial | null = null;
function poleMetalMat(): THREE.MeshStandardMaterial {
  if (!_pole) _pole = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.5, metalness: 0.65 });
  return _pole;
}
let _signFace: THREE.MeshStandardMaterial | null = null;
function signFaceMat(): THREE.MeshStandardMaterial {
  // retroreflective panel: pale face, white/grey emissive .4 (drive-by glint)
  if (!_signFace) {
    _signFace = new THREE.MeshStandardMaterial({
      color: 0xe8eaee, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.08,
    });
  }
  return _signFace;
}
let _signBack: THREE.MeshStandardMaterial | null = null;
function signBackMat(): THREE.MeshStandardMaterial {
  if (!_signBack) _signBack = new THREE.MeshStandardMaterial({ color: 0x7f868e, roughness: 0.7, metalness: 0.3 });
  return _signBack;
}
let _lampGlow: THREE.MeshStandardMaterial | null = null;
function lampGlowMat(): THREE.MeshStandardMaterial {
  if (!_lampGlow) {
    _lampGlow = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd9a0, emissiveIntensity: 2.6 });
  }
  return _lampGlow;
}
// library rock materials lack vertexColors — derive AO-enabled clones once
const _aoMats = new Map<string, THREE.MeshStandardMaterial>();
function rockAOMat(base: THREE.MeshStandardMaterial, key: string): THREE.MeshStandardMaterial {
  let m = _aoMats.get(key);
  if (!m) {
    m = base.clone();
    m.vertexColors = true;
    _aoMats.set(key, m);
  }
  return m;
}

/* ================================================================
   GEOMETRY HELPERS
   ================================================================ */

/**
 * Deterministic vertex displacement keyed on POSITION (not index):
 * polyhedron geometries are non-indexed (duplicate verts per face),
 * so identical positions must move identically or the mesh tears.
 */
function jolt(geo: THREE.BufferGeometry, seed: number, amp: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = hash2(
      v.x * 37.13 + v.y * 11.31 + seed * 91.7,
      v.y * 53.77 + v.z * 29.03 - seed * 47.9,
    );
    v.multiplyScalar(1 + (n - 0.5) * amp);
    v.y *= 0.82;                       // squat, weathered profile
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Bake vertex-color AO: darkens toward the bottom of the bbox. */
function bakeAO(geo: THREE.BufferGeometry): void {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const span = Math.max(1e-4, bb.max.y - bb.min.y);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - bb.min.y) / span));
    const sh = 0.52 + 0.48 * t;
    col[i * 3] = sh; col[i * 3 + 1] = sh; col[i * 3 + 2] = sh;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** One displaced + AO-baked rock variant (built once per key). */
function rockVariant(key: string, seed: number): THREE.BufferGeometry {
  return cached(key, () => {
    const g = new THREE.DodecahedronGeometry(1, 2);
    jolt(g, seed, 0.5);
    bakeAO(g);
    return g;
  });
}

/* ================================================================
   PINE — conifer, 6 drooping cone tiers (snowy gets caps)
   ================================================================ */

const PINE_TIERS = 6;

export function makePine(snowy: boolean, mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(cached('pine:trunk', () => new THREE.CylinderGeometry(0.16, 0.38, 1.6, 10)), mats.trunk);
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  g.add(trunk);

  // small branch cylinders poking out of the lower trunk
  const branchGeo = cached('pine:branch', () => new THREE.CylinderGeometry(0.04, 0.07, 0.9, 5));
  for (let br = 0; br < 3; br++) {
    const branch = new THREE.Mesh(branchGeo, mats.trunk);
    branch.position.set(0, 0.6 + br * 0.45, 0);
    branch.rotation.z = 1.1 + hash2(br, 3) * 0.3;
    branch.rotation.y = br * 2.4 + hash2(br, 9) * 1.5;
    branch.translateY(0.45);
    g.add(branch);
  }

  // 6 tiers, radialSegments 14, per-tier droop jitter (deepens upward)
  for (let i = 0; i < PINE_TIERS; i++) {
    const rad = 1.85 - i * 0.245;
    const hgt = 1.5 - i * 0.09;
    const y = 1.7 + i * 0.92;
    const leaf = snowy ? (i === 0 ? mats.pineSnow : mats.pineDark) : mats.pineGreen;
    const cone = new THREE.Mesh(
      cached(`pine:tier:${i}`, () => new THREE.ConeGeometry(rad, hgt, 14)),
      leaf,
    );
    cone.position.y = y;
    cone.rotation.y = i * 0.5;                                        // break silhouette repetition
    cone.rotation.z = (hash2(i, 13) - 0.5) * 0.12 + i * 0.012;        // droop per tier
    cone.castShadow = true;
    g.add(cone);

    if (snowy) {
      const cap = new THREE.Mesh(
        cached(`pine:snowcap:${i}`, () => new THREE.ConeGeometry(rad * 0.62, hgt * 0.36, 14)),
        mats.cap,
      );
      cap.position.y = y + hgt * 0.42;
      g.add(cap);
    }
  }
  return g;
}

/* ================================================================
   BROADLEAF — meadow tree: tapered trunk, visible branches,
   icosahedron puff-cluster canopy (detail 2, squashed organic),
   tiny fruit dots for close-up interest.
   ================================================================ */

export function makeBroadleaf(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(cached('bl:trunk', () => new THREE.CylinderGeometry(0.18, 0.32, 2.1, 8)), mats.trunk);
  trunk.position.y = 1.05;
  trunk.castShadow = true;
  g.add(trunk);

  // root flare so the trunk meets the ground planted, not stuck-on
  const flare = new THREE.Mesh(cached('bl:flare', () => new THREE.SphereGeometry(0.3, 10, 6)), mats.trunk);
  flare.scale.set(1.25, 0.55, 1.25);
  flare.position.y = 0.12;
  g.add(flare);

  // branches reaching from trunk into the canopy
  const branchGeo = cached('bl:branch', () => new THREE.CylinderGeometry(0.05, 0.09, 1.5, 5));
  for (let br = 0; br < 4; br++) {
    const branch = new THREE.Mesh(branchGeo, mats.trunk);
    branch.position.y = 1.3 + br * 0.28;
    branch.rotation.z = 0.8 + hash2(br, 21) * 0.4;
    branch.rotation.y = br * 2.1 + hash2(br, 31) * 1.2;
    branch.translateY(0.75);
    g.add(branch);
  }

  // puff-cluster canopy (wind shader bends tips, never shears puffs:
  // each puff geometry is translated so its base sits at y=0 pre-scale)
  const canopy = new THREE.Group();
  canopy.position.y = 2.7;
  const npuffs = 6 + Math.floor(hash2(77, 5) * 3);                    // 6-8
  for (let i = 0; i < npuffs; i++) {
    const pr = 0.7 + hash2(i, 7) * 0.55;
    const puffGeo = cached(`bl:puff:${pr.toFixed(2)}`, () => {
      const pg = new THREE.IcosahedronGeometry(pr, 2);
      pg.translate(0, pr, 0);          // base at y=0 → bend pivots at root
      pg.scale(1, 0.85, 1);            // organic squashed-sphere puff
      return pg;
    });
    const puff = new THREE.Mesh(puffGeo, mats.treeLeaf);
    puff.position.set((hash2(i, 1) - 0.5) * 1.8, (hash2(i, 2) - 0.5) * 1.2 - pr * 0.5, (hash2(i, 3) - 0.5) * 1.8);
    puff.castShadow = true;
    canopy.add(puff);
  }

  // tiny fruit / flower dots scattered on the canopy
  const dotGeo = cached('bl:dot', () => new THREE.SphereGeometry(0.075, 6, 5));
  for (let f = 0; f < 5; f++) {
    const dot = new THREE.Mesh(dotGeo, f % 2 ? mats.pickupCoin : mats.pickupFuel);
    const a = hash2(f, 41) * Math.PI * 2;
    const rr = 0.8 + hash2(f, 43) * 0.9;
    dot.position.set(Math.sin(a) * rr, 0.6 + hash2(f, 47) * 1.4, Math.cos(a) * rr);
    canopy.add(dot);
  }

  g.add(canopy);
  return g;
}

/* ================================================================
   ROCK — displaced dodecahedron variants (AO-baked), single or
   half-buried cluster. Three geometry variants exist module-wide;
   every rock picks among them deterministically.
   ================================================================ */

export function makeRock(volcanic: boolean, mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const mat = rockAOMat(volcanic ? mats.rockVolc : mats.rockGray, volcanic ? 'volc' : 'gray');

  // 30% become 2-3 rock clusters (half-buried, varied size)
  if (hash2(901, 7) < 0.3) {
    const n = 2 + Math.floor(hash2(23, 5) * 2);
    for (let i = 0; i < n; i++) {
      const geo = rockVariant(`rock:v${i % 3}`, 11 + (i % 3) * 29);
      const r = new THREE.Mesh(geo, mat);
      r.castShadow = true;
      const s = 0.55 + hash2(i, 61) * 0.65;
      r.scale.setScalar(s);
      r.position.set((hash2(i, 63) - 0.5) * 1.6, 0.15 + hash2(i, 67) * 0.25, (hash2(i, 71) - 0.5) * 1.6);
      r.rotation.set(hash2(i, 73) * 3, hash2(i, 79) * 3, hash2(i, 83) * 3);
      g.add(r);
    }
  } else {
    const r = new THREE.Mesh(rockVariant('rock:v0', 11), mat);
    r.castShadow = true;
    r.scale.setScalar(1.15);
    r.position.y = 0.32;
    g.add(r);
  }
  return g;
}

/* ================================================================
   SNOW PILE — drifted mound + shaded crust + windrow lumps
   ================================================================ */

export function makeSnowPile(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();

  const mound = new THREE.Mesh(cached('snow:mound', () => new THREE.SphereGeometry(1, 20, 14)), mats.cap);
  mound.scale.set(1.15, 0.42, 0.92);
  mound.position.y = 0.04;
  mound.rotation.y = hash2(5, 9) * Math.PI;
  mound.castShadow = true;
  mound.receiveShadow = true;
  g.add(mound);

  // bluish shadow crust where the drift folds over
  const crust = new THREE.Mesh(cached('snow:crust', () => new THREE.SphereGeometry(0.66, 14, 10)), mats.pineSnow);
  crust.scale.set(1.05, 0.4, 0.85);
  crust.position.set(0.5, 0.05, -0.3);
  crust.receiveShadow = true;
  g.add(crust);

  // small windrow lumps around the base
  const lumpGeo = cached('snow:lump', () => new THREE.SphereGeometry(0.2, 8, 6));
  for (let i = 0; i < 3; i++) {
    const lump = new THREE.Mesh(lumpGeo, mats.cap);
    const a = hash2(i, 17) * Math.PI * 2;
    const rr = 0.75 + hash2(i, 19) * 0.4;
    lump.position.set(Math.sin(a) * rr, 0.08, Math.cos(a) * rr);
    lump.scale.y = 0.7;
    g.add(lump);
  }
  return g;
}

/* ================================================================
   CACTUS — saguaro: tapered ribbed body, rounded crown, two arms
   (horizontal reach + vertical rise, slight taper), areole dots
   ================================================================ */

export function makeCactus(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(cached('cac:body', () => new THREE.CylinderGeometry(0.3, 0.4, 2.9, 12)), mats.cactus);
  body.position.y = 1.45;
  body.castShadow = true;
  g.add(body);

  const crown = new THREE.Mesh(
    cached('cac:crown', () => new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    mats.cactus,
  );
  crown.position.y = 2.9;
  g.add(crown);

  // unit arm segments (stretched per-arm via scale) — one cached pair
  const hSeg = cached('cac:hseg', () => new THREE.CylinderGeometry(0.17, 0.19, 1, 10));
  const vSeg = cached('cac:vseg', () => new THREE.CylinderGeometry(0.15, 0.17, 1, 10));
  const knobGeo = cached('cac:knob', () => new THREE.SphereGeometry(0.15, 8, 6));

  const arm = (
    side: 1 | -1, h0: number, reach: number, rise: number,
  ): void => {
    const grp = new THREE.Group();
    const hor = new THREE.Mesh(hSeg, mats.cactus);       // outward reach
    hor.scale.y = reach;
    hor.rotation.z = side * Math.PI / 2;
    hor.castShadow = true;
    grp.add(hor);
    const elbowY = h0;
    const ver = new THREE.Mesh(vSeg, mats.cactus);       // vertical rise
    ver.scale.y = rise;
    ver.position.set(side * reach, rise / 2, 0);
    ver.castShadow = true;
    grp.add(ver);
    const tip = new THREE.Mesh(knobGeo, mats.cactus);
    tip.position.set(side * reach, rise, 0);
    tip.scale.y = 0.75;
    grp.add(tip);
    grp.rotation.y = (hash2(side > 0 ? 3 : 5, 27) - 0.5) * 0.5;
    grp.position.y = elbowY;
    g.add(grp);
  };
  arm(1, 1.35, 0.55, 0.95);   // right arm, lower
  arm(-1, 1.75, 0.48, 0.7);   // left arm, higher

  // areoles (spine dots) down the body for close-up read
  const dot = cached('cac:dot', () => new THREE.SphereGeometry(0.045, 6, 4));
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(dot, mats.deadBush);
    const a = hash2(i, 37) * Math.PI * 2;
    d.position.set(Math.sin(a) * 0.33, 0.5 + i * 0.55, Math.cos(a) * 0.33);
    g.add(d);
  }
  return g;
}

/* ================================================================
   DEAD BUSH — 5-7 curved twigs splaying from one root point
   ================================================================ */

export function makeDeadBush(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const nSticks = 5 + Math.floor(hash2(51, 17) * 3);                  // 5-7

  for (let i = 0; i < nSticks; i++) {
    // curved twig: catmull-rom tube wandering upward, cached per shape
    const stickGeo = cached(`db:stick:${i}`, () => {
      const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
      for (let k = 1; k <= 3; k++) {
        pts.push(new THREE.Vector3(
          (hash2(i * 7 + k, 101) - 0.5) * 0.5 * k,
          0.3 * k,
          (hash2(i * 13 + k, 211) - 0.5) * 0.5 * k,
        ));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.035, 4, false);
    });
    const st = new THREE.Mesh(stickGeo, mats.deadBush);
    st.position.set(Math.sin(i * 2.4) * 0.16, 0, Math.cos(i * 2.4) * 0.16);
    st.rotation.y = hash2(i, 53) * Math.PI * 2;
    st.castShadow = true;
    g.add(st);
  }
  return g;
}

/* ================================================================
   FALLEN LOG — weathered trunk on its side, mossy cut ends +
   moss stripe along the top, 2 mushroom dots, snapped stub
   ================================================================ */

export function makeFallenLog(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const yaw = new THREE.Group();                 // deterministic resting heading
  yaw.rotation.y = hash2(3, 3) * Math.PI;
  g.add(yaw);

  const log = new THREE.Mesh(cached('log:body', () => new THREE.CylinderGeometry(0.27, 0.34, 2.7, 12)), mats.trunk);
  log.rotation.z = Math.PI / 2;                  // lie along local X
  log.position.y = 0.31;
  log.castShadow = true;
  g.add(log);                                    // NOTE: outside yaw → heading below still varies via log? no:
  // (kept on yaw for coherent furniture — see re-add below)
  yaw.add(log);
  g.remove(log);

  // mossy cut ends (legacy look) — discs capping both ends
  const capGeo = cached('log:endcap', () => new THREE.CircleGeometry(0.29, 12));
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, mossMat());
    cap.position.set(s * 1.351, 0.31, 0);
    cap.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    yaw.add(cap);
  }

  // moss stripe draped along the sun-side top of the trunk
  const mossStripe = new THREE.Mesh(cached('log:mossstripe', () => new THREE.CylinderGeometry(0.115, 0.135, 1.7, 8)), mossMat());
  mossStripe.rotation.z = Math.PI / 2;
  mossStripe.position.set(0.1, 0.56, 0.14);
  yaw.add(mossStripe);

  // two mushroom dots on top of the log
  const stemGeo = cached('shroom:stem', () => new THREE.CylinderGeometry(0.03, 0.045, 0.14, 6));
  const capShroomGeo = cached('shroom:cap', () => new THREE.SphereGeometry(0.09, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2));
  const spots: [number, number][] = [[0.45, 0.16], [-0.85, -0.1]];
  for (const [mx, mz] of spots) {
    const stem = new THREE.Mesh(stemGeo, mats.trunk);
    stem.position.set(mx, 0.62, mz);
    yaw.add(stem);
    const shCap = new THREE.Mesh(capShroomGeo, mats.cap);
    shCap.position.set(mx, 0.69, mz);
    shCap.scale.y = 0.7;
    shCap.castShadow = true;
    yaw.add(shCap);
  }

  // snapped branch stub
  const stub = new THREE.Mesh(cached('log:stub', () => new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6)), mats.trunk);
  stub.position.set(-0.5, 0.55, -0.2);
  stub.rotation.set(0.5, 0, -0.7);
  stub.castShadow = true;
  yaw.add(stub);

  return g;
}

/* ================================================================
   LAVA POOL — emissive molten disc + hotter inner ring + crust
   rocks ringing the rim + warm PointLight (bloom-fed via postfx)
   ================================================================ */

export function makeLavaPool(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();

  const pool = new THREE.Mesh(cached('lava:disc', () => new THREE.CircleGeometry(1.95, 24)), mats.lava);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.05;
  g.add(pool);

  const core = new THREE.Mesh(cached('lava:core', () => new THREE.CircleGeometry(1.15, 20)), mats.lava);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.075;
  g.add(core);

  // cooled crust rocks strung around the rim
  const crustGeo = cached('lava:crust', () => {
    const cg = new THREE.DodecahedronGeometry(0.5, 1);
    jolt(cg, 71, 0.55);
    return cg;
  });
  for (let i = 0; i < 5; i++) {
    const rock = new THREE.Mesh(crustGeo, mats.rockVolc);
    const a = (i / 5) * Math.PI * 2 + hash2(i, 81) * 0.8;
    const rr = 1.85 + hash2(i, 83) * 0.3;
    rock.position.set(Math.sin(a) * rr, 0.12 + hash2(i, 87) * 0.12, Math.cos(a) * rr);
    rock.scale.setScalar(0.45 + hash2(i, 89) * 0.4);
    rock.rotation.set(hash2(i, 91) * 3, hash2(i, 93) * 3, hash2(i, 97) * 3);
    rock.castShadow = true;
    g.add(rock);
  }

  const light = new THREE.PointLight(0xff5a1f, 10, 18);
  light.position.y = 0.8;
  g.add(light);

  return g;
}

/* ================================================================
   ROAD FURNITURE — makeRoadProps('sign' | 'lamp')
   Consumer decides placement (both only make sense near roads).
   Base at y=0; +Z of the group faces across the road.
   ================================================================ */

export function makeRoadProps(kind: 'sign' | 'lamp', mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  void mats; // library carries no furniture paint yet; locals cover it

  if (kind === 'sign') {
    const pole = new THREE.Mesh(cached('road:signpole', () => new THREE.CylinderGeometry(0.05, 0.065, 2.6, 8)), poleMetalMat());
    pole.position.y = 1.3;
    pole.castShadow = true;
    g.add(pole);

    // rectangular reflective panel at drive-by height
    const panel = new THREE.Mesh(cached('road:panel', () => new THREE.BoxGeometry(1.15, 0.85, 0.06)), signFaceMat());
    panel.position.y = 2.05;
    panel.castShadow = true;
    g.add(panel);

    // darker back plate so the panel reads from both sides
    const back = new THREE.Mesh(cached('road:backplate', () => new THREE.BoxGeometry(1.22, 0.92, 0.03)), signBackMat());
    back.position.set(0, 2.05, -0.045);
    g.add(back);
    return g;
  }

  /* ---- lamp ---- */
  const pole = new THREE.Mesh(cached('road:lamppole', () => new THREE.CylinderGeometry(0.07, 0.105, 6.4, 10)), poleMetalMat());
  pole.position.y = 3.2;
  pole.castShadow = true;
  g.add(pole);

  // outreach arm reaching over the asphalt (+X of the group)
  const arm = new THREE.Mesh(cached('road:lamparm', () => new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8)), poleMetalMat());
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.7, 6.32, 0);
  arm.castShadow = true;
  g.add(arm);

  const head = new THREE.Mesh(cached('road:lamphead', () => new THREE.BoxGeometry(0.6, 0.18, 0.3)), poleMetalMat());
  head.position.set(1.3, 6.24, 0);
  head.castShadow = true;
  g.add(head);

  const lens = new THREE.Mesh(cached('road:lamplens', () => new THREE.BoxGeometry(0.46, 0.05, 0.22)), lampGlowMat());
  lens.position.set(1.3, 6.13, 0);
  g.add(lens);

  const light = new THREE.PointLight(0xffbf86, 20, 30);   // warm pool on the road
  light.position.set(1.3, 5.95, 0);
  g.add(light);

  return g;
}
