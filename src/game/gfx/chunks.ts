import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CHUNK, SEG, IS_MOBILE, hash2, valueNoise,
} from './noise';
import {
  terrainH, terrainNormalInto, biomeAt, roadDist,
  ROAD_HALF_WIDTH, ROAD_SHOULDER,
  islandMask, ISLAND_HALF, ROAD_END, BULB_W,
} from './terrain';
import type { BuiltChunk, ChunkBuildContext, ChunkObstacle } from './types';

/* ================================================================
   gfx/chunks.ts — chunk builder: terrain skin, asphalt ribbons for
   the 5-road network, batched instanced scatter, lakes, pickups,
   road furniture. All world-gen deterministic (hash-based).

   PERF MODEL: every static prop category becomes ONE InstancedMesh
   per chunk (merged, vertex-coloured geometry) ⇒ a full chunk costs
   roughly: 1 terrain + ~2 road ribbons + ~8 prop batches + 2 grass +
   pebbles/flowers ⇒ ~15 draw calls regardless of prop count.
   ================================================================ */

/* ---------------- merged, vertex-coloured prototype geometries ---------------- */

function colorize(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  if (!geo.index && !geo.getAttribute('normal')) geo.computeVertexNormals();
  return geo;
}

function xform(geo: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  const g = geo.clone();
  g.applyMatrix4(m);
  return g;
}

const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _upQ = new THREE.Vector3(0, 1, 0);

/* memo for merged prototypes */
const protoCache = new Map<string, THREE.BufferGeometry | null>();
function cachedMerged(key: string, maker: () => THREE.BufferGeometry | null): THREE.BufferGeometry | null {
  if (!protoCache.has(key)) protoCache.set(key, maker());
  return protoCache.get(key) ?? null;
}

function compose(px: number, py: number, pz: number, rx: number, ry: number, rz: number, s = 1): THREE.Matrix4 {
  _e.set(rx, ry, rz);
  return _m.compose(
    new THREE.Vector3(px, py, pz),
    new THREE.Quaternion().setFromEuler(_e),
    new THREE.Vector3(s, s, s),
  ).clone();
}

/* ---- pine (merged trunk+branches / merged foliage w/ baked colours) ---- */
const PINE_TIERS = 7;
function pineParts(): { trunk: THREE.BufferGeometry; foliSnow: THREE.BufferGeometry; foliGreen: THREE.BufferGeometry } {
  return {
    trunk: cachedMerged('pine-trunk-full', () => {
      const parts: THREE.BufferGeometry[] = [];
      const tg = colorize(new THREE.CylinderGeometry(.16, .42, 1.8, 10), 0x5e4128);
      tg.translate(0, .9, 0);
      parts.push(tg);
      const bg = new THREE.CylinderGeometry(.04, .08, 1.1, 5);
      bg.translate(0, .55, 0);
      colorize(bg, 0x5e4128);
      for (let br = 0; br < 5; br++) {
        parts.push(xform(bg, compose(0, .7 + br * .5, 0, 0, br * 2.4 + hash2(br, 9) * 1.5, 1.05 + hash2(br, 3) * .35)));
      }
      return mergeGeometries(parts, false);
    })!,
    foliSnow: cachedMerged('pine-foli-snow', () => {
      const parts: THREE.BufferGeometry[] = [];
      /* 3 stacked cones per tier ⇒ full silhouette, no gaps */
      for (let i = 0; i < PINE_TIERS; i++) {
        const rad = (1.95 - i * .24);
        const cone = colorize(new THREE.ConeGeometry(rad, 1.5, 12), i === 0 ? 0x35604b : 0x243d30);
        parts.push(xform(cone, compose(0, 2.0 + i * .88, 0, (hash2(i, 13) - .5) * .12, i * .5, 0)));
        const inner = colorize(new THREE.ConeGeometry(rad * .82, 1.15, 10), i % 2 ? 0x2a4a38 : 0x20402f);
        parts.push(xform(inner, compose(0, 2.0 + i * .88 - .28, 0, 0, i * 1.3, 0)));
        const cap = colorize(new THREE.ConeGeometry(rad * .66, .55, 12), 0xfdfeff);
        parts.push(xform(cap, compose(0, 2.62 + i * .88, 0, 0, i * .5, 0)));
      }
      return mergeGeometries(parts, false);
    })!,
    foliGreen: cachedMerged('pine-foli-green', () => {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < PINE_TIERS; i++) {
        const rad = (1.95 - i * .24);
        const cone = colorize(new THREE.ConeGeometry(rad, 1.5, 12), i === 0 ? 0x2e6b34 : 0x245226);
        parts.push(xform(cone, compose(0, 2.0 + i * .88, 0, (hash2(i, 13) - .5) * .12, i * .5, 0)));
        const inner = colorize(new THREE.ConeGeometry(rad * .82, 1.15, 10), i % 2 ? 0x1f4d20 : 0x2a5c2c);
        parts.push(xform(inner, compose(0, 2.0 + i * .88 - .28, 0, 0, i * 1.3, 0)));
      }
      return mergeGeometries(parts, false);
    })!,
  };
}

/* ---- broadleaf ---- */
function broadParts(): { trunk: THREE.BufferGeometry; foli: THREE.BufferGeometry } {
  return {
    trunk: cachedMerged('broad-trunk-full', () => {
      const parts: THREE.BufferGeometry[] = [];
      const tg = colorize(new THREE.CylinderGeometry(.18, .3, 2, 7), 0x5e4128);
      tg.translate(0, 1, 0);
      parts.push(tg);
      const bg = new THREE.CylinderGeometry(.05, .09, 1.5, 5);
      bg.translate(0, .75, 0);
      colorize(bg, 0x5e4128);
      for (let br = 0; br < 3; br++) {
        parts.push(xform(bg, compose(0, 1.3 + br * .3, 0, 0, br * 2.1 + hash2(br, 31) * 1.2, .8 + hash2(br, 21) * .4)));
      }
      return mergeGeometries(parts, false);
    })!,
    foli: cachedMerged('broad-foli', () => {
      const parts: THREE.BufferGeometry[] = [];
      /* 11 puffs in two shells ⇒ dense rounded canopy */
      for (let i = 0; i < 11; i++) {
        const pr = .78 + (i % 3) * .24;
        const puff = new THREE.IcosahedronGeometry(pr, 2);
        puff.translate(0, pr, 0);
        puff.scale(1, .86, 1);
        colorize(puff, i % 3 === 0 ? 0x39793c : 0x2e6b34);
        const shellR = i < 6 ? .95 : 1.55;
        const a = (i / (i < 6 ? 6 : 5)) * Math.PI * 2;
        parts.push(xform(puff, compose(
          Math.cos(a) * shellR * .62, 2.35 + (i < 6 ? .35 : .85) + (hash2(i, 2) - .5) * .7,
          Math.sin(a) * shellR * .62,
          0, hash2(i, 51) * 6.28, 0,
        )));
      }
      return mergeGeometries(parts, false);
    })!,
  };
}

/* ---- other merged singles ---- */
function rockProto(v: number): THREE.BufferGeometry {
  return cachedMerged(`rock-p${v}`, () => {
    const base = new THREE.DodecahedronGeometry(1.1, 1);
    const pos = base.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + (hash2(i * 3.1 + v * 17.7, v * 5.3) - .5) * .38;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * .78, pos.getZ(i) * k);
    }
    base.computeVertexNormals();
    colorize(base, 0x82898f);
    return base;
  })!;
}
function logProto(): THREE.BufferGeometry {
  return cachedMerged('log-p', () => {
    const l = new THREE.CylinderGeometry(.28, .34, 2.6, 10);
    l.rotateZ(Math.PI / 2);
    l.translate(0, .32, 0);
    const mossEnds = new THREE.CircleGeometry(.3, 10);
    colorize(l, 0x5e4128);
    colorize(mossEnds, 0x4f7038);
    const a = xform(mossEnds, compose(-1.3, .32, 0, 0, -Math.PI / 2, 0));
    const b = xform(mossEnds, compose(1.3, .32, 0, 0, Math.PI / 2, 0));
    return mergeGeometries([l, a, b], false);
  })!;
}
function cactusProto(): THREE.BufferGeometry {
  return cachedMerged('cactus-p', () => {
    const body = new THREE.CylinderGeometry(.34, .4, 2.8, 9);
    body.translate(0, 1.4, 0);
    colorize(body, 0x43804a);
    const arm = new THREE.CylinderGeometry(.2, .22, 1.15, 7);
    colorize(arm, 0x43804a);
    const armT = xform(arm, compose(.6, 1.7, 0, 0, 0, -.85));
    const arm2T = xform(arm, compose(-.52, 2.05, 0, 0, 0, .95));
    for (const g of [armT, arm2T]) { g.scale(.85, .85, .85); }
    return mergeGeometries([body, armT, arm2T], false);
  })!;
}
function bushProto(): THREE.BufferGeometry {
  return cachedMerged('bush-p', () => {
    const parts: THREE.BufferGeometry[] = [];
    const st = new THREE.CylinderGeometry(.03, .05, 1, 5);
    st.translate(0, .5, 0);
    colorize(st, 0x9a7b4f);
    for (let i = 0; i < 6; i++) {
      parts.push(xform(st, compose(Math.sin(i * 2.4) * .18, 0, Math.cos(i * 2.4) * .18, Math.sin(i) * .5, 0, Math.cos(i) * .5)));
    }
    return mergeGeometries(parts, false);
  })!;
}
function pileProto(): THREE.BufferGeometry {
  return cachedMerged('pile-p', () => {
    const s = new THREE.SphereGeometry(1, 10, 8);
    s.scale(1, .45, 1);
    s.translate(0, .1, 0);
    return colorize(s, 0xfdfeff);
  })!;
}

/** one shared vertex-colour material for ALL instanced props */
let propMat: THREE.MeshStandardMaterial | null = null;
function getPropMat(): THREE.MeshStandardMaterial {
  if (!propMat) {
    propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: .02 });
  }
  return propMat;
}

interface Batch { geo: THREE.BufferGeometry; mats: THREE.Matrix4[]; tints?: number[] }
function flushBatch(group: THREE.Group, b: Batch, dummy: THREE.Object3D): void {
  if (!b.mats.length) return;
  const inst = new THREE.InstancedMesh(b.geo, getPropMat(), b.mats.length);
  for (let i = 0; i < b.mats.length; i++) {
    inst.setMatrixAt(i, b.mats[i]);
    if (b.tints) {
      const c = new THREE.Color(b.tints[i]);
      inst.setColorAt(i, c);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  group.add(inst);
}

/* ---------------- grass: merged TUFT (one instance = a clump) ----------------
   Real turf = thousands of blades/m². We fake it honestly: each instance is a
   crossed fan of 10 textured blades, so 3400 instances read as ~34k blades.
   Blades are planted at y=0 and the whole tuft gets tilted to the terrain
   normal by the placer (no random floaters). */
/* fuller clump: 8 arced blades + 2 centre spikes ⇒ ~10 blades/instance */
function bladePlane(leanX: number, rotY: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(.11, .58, 1, 3);
  g.translate(0, .29, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const h = p.getY(i);
    p.setZ(i, h * h * .26);                   // gentle arc, tip leans most
    p.setX(i, p.getX(i) + h * leanX);         // per-blade lean
  }
  /* normals all point UP: every blade shades like the ground does —
     kills the dark-backface slivers DoubleSide cards otherwise get */
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  g.rotateY(rotY);
  return g;
}
export function buildClumpGeo(): THREE.BufferGeometry {
  return cachedMerged('grass-clump', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      parts.push(bladePlane((hash2(i, 61) - .5) * .95, (i / 8) * Math.PI * 2 + hash2(i, 62)));
    }
    /* centre vertical spikes */
    parts.push(bladePlane(0, hash2(9, 63)));
    parts.push(bladePlane(.08, hash2(11, 64)));
    return mergeGeometries(parts, false)!;
  })!;
}

/* ================================================================
   ROAD RIBBONS — sampled strips along each centreline.
   UVs: u 0..1 across width, v = arcLen/11 so the dashed-line
   texture (asphalt atlas) cycles every 11 m. Geometry UVs are
   SCALED (the asphalt texture stays repeat 1,1 — it is SHARED).
   ================================================================ */
interface RibbonSamples { cx: number; cz: number; nx: number; nz: number }

function buildRibbon(samples: RibbonSamples[], group: THREE.Group, mat: THREE.Material): void {
  if (samples.length < 2) return;
  const HW = ROAD_HALF_WIDTH;
  const verts: number[] = [], uvs: number[] = [], idx: number[] = [];
  let vDist = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (i > 0) {
      const p = samples[i - 1];
      vDist += Math.hypot(s.cx - p.cx, s.cz - p.cz);
    }
    const yL = terrainH(s.cx + s.nx * HW, s.cz + s.nz * HW) + .07;
    const yR = terrainH(s.cx - s.nx * HW, s.cz - s.nz * HW) + .07;
    /* slight crown: centre a touch higher than edges */
    const yC = terrainH(s.cx, s.cz) + .09;
    verts.push(
      s.cx + s.nx * HW, yL, s.cz + s.nz * HW,
      s.cx, yC, s.cz,
      s.cx - s.nx * HW, yR, s.cz - s.nz * HW,
    );
    uvs.push(0, vDist / 11, .5, vDist / 11, 1, vDist / 11);
    if (i > 0) {
      const b = (i - 1) * 3;
      idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4);
      idx.push(b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  group.add(m);
}

function tangentNormal(cx: number, cz: number, tx: number, tz: number): { nx: number; nz: number } {
  const len = Math.hypot(tx, tz) || 1;
  return { nx: -tz / len, nz: tx / len };
}

/** collect ribbon samples for all five roads within chunk±margin */
function roadRibbons(cx: number, cz: number): RibbonSamples[][] {
  const ox = cx * CHUNK, oz = cz * CHUNK;
  const MARGIN = 18;
  const out: RibbonSamples[][] = [];
  const inB = (x: number, z: number): boolean =>
    x >= ox - MARGIN && x <= ox + CHUNK + MARGIN && z >= oz - MARGIN && z <= oz + CHUNK + MARGIN &&
    Math.abs(x) <= ISLAND_HALF && Math.abs(z) <= ISLAND_HALF;   // roads stop at the shore

  /* N-S spine x=0 — stops at the U-turn bulb, never reaches the sea */
  {
    const s: RibbonSamples[] = [];
    const zLo = Math.max(oz - MARGIN, -ROAD_END - BULB_W * .6);
    const zHi = Math.min(oz + CHUNK + MARGIN, ROAD_END + BULB_W * .6);
    for (let z = zLo; z <= zHi; z += 6) {
      if (!inB(0, z)) continue;
      const n = tangentNormal(0, z, 0, 1);
      s.push({ cx: 0, cz: z, ...n });
    }
    out.push(s);
  }
  /* E-W spine z=0 */
  {
    const s: RibbonSamples[] = [];
    const xLo = Math.max(ox - MARGIN, -ROAD_END - BULB_W * .6);
    const xHi = Math.min(ox + CHUNK + MARGIN, ROAD_END + BULB_W * .6);
    for (let x = xLo; x <= xHi; x += 6) {
      if (!inB(x, 0)) continue;
      const n = tangentNormal(x, 0, 1, 0);
      s.push({ cx: x, cz: 0, ...n });
    }
    out.push(s);
  }
  /* ring r=260+8sin(5θ) */
  {
    const s: RibbonSamples[] = [];
    const step = 6 / 260;                       // ≈6 m arclength
    for (let th = 0; th < Math.PI * 2; th += step) {
      const r = 260 + 8 * Math.sin(th * 5);
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      if (!inB(x, z)) continue;
      const n = tangentNormal(x, z, -Math.sin(th), Math.cos(th));
      s.push({ cx: x, cz: z, ...n });
    }
    out.push(s);
  }
  /* diagonal A: z = 140·sin(.008x)+60 */
  {
    const s: RibbonSamples[] = [];
    for (let x = ox - MARGIN; x <= ox + CHUNK + MARGIN; x += 6) {
      const z = 140 * Math.sin(x * .008) + 60;
      if (!inB(x, z)) continue;
      const n = tangentNormal(x, z, 1, 140 * .008 * Math.cos(x * .008));
      s.push({ cx: x, cz: z, ...n });
    }
    out.push(s);
  }
  /* diagonal B: x = −120·sin(.007z)−70 */
  {
    const s: RibbonSamples[] = [];
    for (let z = oz - MARGIN; z <= oz + CHUNK + MARGIN; z += 6) {
      const x = -120 * Math.sin(z * .007) - 70;
      if (!inB(x, z)) continue;
      const n = tangentNormal(x, z, -120 * .007 * Math.cos(z * .007), 1);
      s.push({ cx: x, cz: z, ...n });
    }
    out.push(s);
  }
  return out;
}

/* ================================================================
   MAIN BUILDER
   ================================================================ */
export function buildChunk(cx: number, cz: number, ctx: ChunkBuildContext): BuiltChunk {
  const { mats, pickups, dummy } = ctx;
  const group = new THREE.Group();
  const ox = cx * CHUNK, oz = cz * CHUNK;
  const obstacles: ChunkObstacle[] = [];
  const lakes: { x: number; z: number; r: number }[] = [];
  const b0 = biomeAt(ox + CHUNK / 2, oz + CHUNK / 2);

  /* ---------- terrain mesh ---------- */
  const seg = IS_MOBILE ? 36 : SEG;
  const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setXY(i, uvAttr.getX(i) * 4.5, uvAttr.getY(i) * 4.5);   // ~20 m / tile: reads as ground, not wallpaper
  }
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const col = new THREE.Color();
  const slopeN = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    const wx = posAttr.getX(i) + ox;
    const wz = posAttr.getZ(i) + oz;
    posAttr.setY(i, terrainH(wx, wz));
    const b = biomeAt(wx, wz);
    terrainNormalInto(slopeN, wx, wz, 1.4);
    const steep = 1 - slopeN.y;
    if (b === 0) {
      col.setRGB(.96, .98, 1);
    } else if (b === 1) {
      col.setRGB(.93, .84, .62);
    } else if (b === 3) {
      col.setRGB(.32, .27, .29);
    } else {
      const g = valueNoise(wx * .08, wz * .08);
      col.setRGB(.42 + g * .14, .68 + g * .12, .38 + g * .08);
    }
    if (steep > .28 && b !== 3) {
      col.lerp(new THREE.Color(b === 0 ? 0xb8c2cc : 0x9a8a6a), Math.min(1, (steep - .28) * 3));
    }
    /* gravel shoulders beside asphalt */
    const rd = roadDist(wx, wz);
    const shLo = ROAD_HALF_WIDTH, shHi = ROAD_HALF_WIDTH + ROAD_SHOULDER;
    if (rd < shHi) {
      const t = 1 - Math.max(0, (rd - shLo) / ROAD_SHOULDER);
      col.lerp(new THREE.Color(0x6f6a5f), t * .55);
    }
    const shade = 1 + (valueNoise(wx * .15 + 40, wz * .15 - 40) - .5) * .08;
    col.multiplyScalar(shade);
    col.r = Math.min(1, col.r * 1.55);
    col.g = Math.min(1, col.g * 1.55);
    col.b = Math.min(1, col.b * 1.55);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terr = new THREE.Mesh(geo, mats.ground[b0]);
  terr.position.set(ox, 0, oz);
  terr.receiveShadow = true;
  group.add(terr);

  /* U-turn bulbs where the straights dead-end (asphalt pads, flush).
     Built once per pad: only by the chunk that contains its centre. */
  for (const sx of [-1, 1]) {
    for (const [px, pz2] of [[0, sx * ROAD_END], [sx * ROAD_END, 0]] as const) {
      if (Math.floor(px / CHUNK) !== cx || Math.floor(pz2 / CHUNK) !== cz) continue;
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(ROAD_HALF_WIDTH + BULB_W * .8, 28),
        mats.asphalt,
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(px, terrainH(px, pz2) + .085, pz2);
      pad.receiveShadow = true;
      group.add(pad);
    }
  }

  /* ---------- asphalt ribbons + furniture ---------- */
  const ribbons = roadRibbons(cx, cz);
  let lampCount = 0;
  for (const rs of ribbons) {
    if (rs.length > 1) buildRibbon(rs, group, mats.asphalt);
    /* furniture every ~45 m along this ribbon */
    for (let i = 0; i < rs.length; i++) {
      const s = rs[i];
      const key = Math.floor((s.cx * 1.31 + s.cz * 2.17) / 45);
      const h = hash2(key * 7.7 + cx * 1.7, key * 3.3 + cz * 9.1);
      if (h > .16) continue;
        const kind: 'sign' | 'lamp' =
          h < .08 && !IS_MOBILE && lampCount < 2 && (b0 === 0 || b0 === 2) ? 'lamp' : 'sign';
      if (kind === 'lamp') lampCount++;
      const side = hash2(key, 91) > .5 ? 1 : -1;
      const fx = s.cx + s.nx * side * 8.2;
      const fz = s.cz + s.nz * side * 8.2;
      const prop = kind === 'lamp'
        ? lampFactory(mats)
        : signFactory(mats);
      prop.position.set(fx, terrainH(fx, fz), fz);
      prop.rotation.y = Math.atan2(-s.nx * side, -s.nz * side) + (kind === 'lamp' ? Math.PI : 0);
      group.add(prop);
    }
  }

  /* ---------- instanced scatter ---------- */
  const pine = pineParts();
  const broad = broadParts();
  const batchPineTrunk: Batch = { geo: pine.trunk, mats: [] };
  const batchPineSnow: Batch = { geo: pine.foliSnow, mats: [] };
  const batchPineGreen: Batch = { geo: pine.foliGreen, mats: [] };
  const batchBroadTrunk: Batch = { geo: broad.trunk, mats: [] };
  const batchBroadFoli: Batch = { geo: broad.foli, mats: [] };
  const batchRockG: Batch = { geo: rockProto(0), mats: [], tints: [] };
  const batchRockV: Batch = { geo: rockProto(1), mats: [], tints: [] };
  const batchLog: Batch = { geo: logProto(), mats: [] };
  const batchCactus: Batch = { geo: cactusProto(), mats: [] };
  const batchBush: Batch = { geo: bushProto(), mats: [] };
  const batchPile: Batch = { geo: pileProto(), mats: [] };

  const offRoadClear = (x: number, z: number): boolean =>
    roadDist(x, z) >= ROAD_HALF_WIDTH + ROAD_SHOULDER;

  function placeTree(batch: Batch, trunkBatch: Batch, wx: number, wz: number, s: number, ry: number): void {
    const m = compose(wx, terrainH(wx, wz), wz, 0, ry, 0, s);
    batch.mats.push(m);
    trunkBatch.mats.push(m);
    obstacles.push({ x: wx, z: wz, r: 1.45 * s });
  }

  /* primary jittered grid */
  const CELL = 14;
  const nCells = Math.floor(CHUNK / CELL);
  for (let gx = 0; gx < nCells; gx++) {
    for (let gz = 0; gz < nCells; gz++) {
      const rx = hash2(ox / CELL + gx * 7.13, oz / CELL + gz * 3.71);
      const rz = hash2(ox / CELL + gx * 2.17, oz / CELL + gz * 9.31);
      const pick = hash2(gx * 31.7 + cx * 91.3, gz * 17.9 + cz * 57.1);
      const wx = ox + gx * CELL + rx * CELL;
      const wz = oz + gz * CELL + rz * CELL;
      if (inWaterLocal(wx, wz, ctx) || !offRoadClear(wx, wz) || islandMask(wx, wz) > 0) continue;
      const b = biomeAt(wx, wz);
      const density = b === 0 ? .34 : b === 1 ? .3 : b === 3 ? .3 : .42;
      if (pick > density) continue;
      const ry = rx * Math.PI * 2;
      const s = .8 + rz * .7;
      if (b === 0) {
        const grove = hash2(gx * 3.1 + cx, gz * 5.7 + cz);
        if (grove < .62 && pick < .55) placeTree(batchPineSnow, batchPineTrunk, wx, wz, s, ry);
        else if (pick < .6) { batchRockG.mats.push(compose(wx, terrainH(wx, wz), wz, hash2(gx, 7) * 3, ry, hash2(gz, 9) * 3, s)); batchRockG.tints!.push(0xffffff); obstacles.push({ x: wx, z: wz, r: 1.2 * s }); }
        else if (pick < .68) batchPile.mats.push(compose(wx, terrainH(wx, wz), wz, 0, ry, 0, s));
      } else if (b === 1) {
        if (pick < .14) { batchCactus.mats.push(compose(wx, terrainH(wx, wz), wz, 0, ry, 0, s)); obstacles.push({ x: wx, z: wz, r: .9 * s }); }
        else if (pick < .24) { batchRockG.mats.push(compose(wx, terrainH(wx, wz), wz, hash2(gx, 7) * 3, ry, hash2(gz, 9) * 3, s)); batchRockG.tints!.push(0xd9c9a8); obstacles.push({ x: wx, z: wz, r: 1.3 * s }); }
        else if (pick < .32) batchBush.mats.push(compose(wx, terrainH(wx, wz), wz, 0, ry, 0, s));
      } else if (b === 3) {
        if (pick < .16) lavaPoolAt(group, wx, wz, mats, obstacles);
        else if (pick < .4) { batchRockV.mats.push(compose(wx, terrainH(wx, wz), wz, hash2(gx, 7) * 3, ry, hash2(gz, 9) * 3, s)); batchRockV.tints!.push(0xffffff); obstacles.push({ x: wx, z: wz, r: 1.5 * s }); }
      } else {
        const grove = Math.max(hash2(gx * 7.9 + cz, gz * 2.3 + cx), hash2(gx * 5.3 - cz, gz * 9.1 + cx));
        if (grove < .45 && pick < .45) placeTree(batchPineGreen, batchPineTrunk, wx, wz, s, ry);
        else if (grove < .75 && pick < .58) placeTree(batchBroadFoli, batchBroadTrunk, wx, wz, s, ry);
        else if (pick < .64) { batchRockG.mats.push(compose(wx, terrainH(wx, wz), wz, hash2(gx, 7) * 3, ry, hash2(gz, 9) * 3, s)); batchRockG.tints!.push(0xffffff); obstacles.push({ x: wx, z: wz, r: 1.1 * s }); }
      }
    }
  }

  /* dense forest pass (finer 9 m grid, grove-gated) */
  if (b0 === 0 || b0 === 2) {
    const TCELL = 9;
    const nT = Math.floor(CHUNK / TCELL);
    for (let gx = 0; gx < nT; gx++) {
      for (let gz = 0; gz < nT; gz++) {
        const rx = hash2(ox / TCELL + gx * 4.31 + 11.7, oz / TCELL + gz * 8.13);
        const rz = hash2(ox / TCELL + gx * 6.71, oz / TCELL + gz * 3.47 + 5.5);
        const pick = hash2(gx * 23.7 + cx * 61.1 + 91.7, gz * 41.3 + cz * 13.9);
        const wx = ox + gx * TCELL + rx * TCELL;
        const wz = oz + gz * TCELL + rz * TCELL;
        if (inWaterLocal(wx, wz, ctx) || !offRoadClear(wx, wz) || islandMask(wx, wz) > 0) continue;
        const grove = b0 === 0
          ? hash2(gx * 3.1 + cx, gz * 5.7 + cz)
          : Math.max(hash2(gx * 7.9 + cz, gz * 2.3 + cx), hash2(gx * 5.3 - cz, gz * 9.1 + cx));
        if (grove > .62 || pick > .6) continue;
        const s = .75 + rz * .6;
        const ry = rx * Math.PI * 2;
        if (hash2(wx * 1.31, wz * 2.73) < .08) {
          batchLog.mats.push(compose(wx, terrainH(wx, wz), wz, 0, ry, 0, s));
        } else if (b0 === 0) {
          placeTree(batchPineSnow, batchPineTrunk, wx, wz, s, ry);
        } else if (pick < .3) {
          placeTree(batchPineGreen, batchPineTrunk, wx, wz, s, ry);
        } else {
          placeTree(batchBroadFoli, batchBroadTrunk, wx, wz, s, ry);
        }
      }
    }
  }

  flushBatch(group, batchPineTrunk, dummy);
  flushBatch(group, batchPineSnow, dummy);
  flushBatch(group, batchPineGreen, dummy);
  flushBatch(group, batchBroadTrunk, dummy);
  flushBatch(group, batchBroadFoli, dummy);
  flushBatch(group, batchRockG, dummy);
  flushBatch(group, batchRockV, dummy);
  flushBatch(group, batchLog, dummy);
  flushBatch(group, batchCactus, dummy);
  flushBatch(group, batchBush, dummy);
  flushBatch(group, batchPile, dummy);

  /* ---------- pebbles ---------- */
  {
    const pebGeo = new THREE.DodecahedronGeometry(1, 0);
    const pebbles = new THREE.InstancedMesh(pebGeo, b0 === 3 ? mats.rockVolc : mats.rockGray, 40);
    for (let i = 0; i < 40; i++) {
      const px = ox + (hash2(i * 2.9 + cx * 3.7, cz * 5.1) - .5) * CHUNK;
      const pz = oz + (hash2(cz * 6.3 + i * 1.7, cx * 4.9) - .5) * CHUNK;
      dummy.position.set(px, terrainH(px, pz) + .02, pz);
      dummy.rotation.set(hash2(i, 91) * 3, hash2(i, 92) * 3, hash2(i, 93) * 3);
      dummy.scale.setScalar(.06 + hash2(i, 94) * .09);
      dummy.updateMatrix();
      pebbles.setMatrixAt(i, dummy.matrix);
    }
    pebbles.instanceMatrix.needsUpdate = true;
    pebbles.castShadow = false;
    group.add(pebbles);
  }

  /* ---------- meadow flowers ---------- */
  if (b0 === 2) {
    const headGeo = new THREE.SphereGeometry(.07, 6, 5);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 60);
    const fc = new THREE.Color();
    for (let i = 0; i < 60; i++) {
      const fx = ox + (hash2(i * 3.7 + cx * 8.1, cz * 2.3) - .5) * CHUNK;
      const fz = oz + (hash2(cz * 4.7 + i * 5.3, cx * 6.1) - .5) * CHUNK;
      if (!inWaterLocal(fx, fz, ctx) && offRoadClear(fx, fz)) {
        dummy.position.set(fx, terrainH(fx, fz) + .18, fz);
      }
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(.8 + hash2(i, 95) * .5);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      const roll = hash2(i, 96);
      fc.set(roll < .4 ? 0xffe066 : roll < .75 ? 0xff7ab8 : 0xffffff);
      heads.setColorAt(i, fc);
    }
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    group.add(heads);
  }

  /* ---------- grass: dense normal-aligned tufts (meadow/snow) ---------- */
  if (b0 === 2 || b0 === 0) {
    /* desktop: 3400 clumps/chunk (~34k blades); mobile: 1200 */
    const target = IS_MOBILE ? 1200 : 3400;
    const gGeo = buildClumpGeo();
    const grassA = new THREE.InstancedMesh(gGeo, mats.grassBladeA, Math.ceil(target / 2));
    const grassB = new THREE.InstancedMesh(gGeo, mats.grassBladeB, target - Math.ceil(target / 2));
    const nrmV = new THREE.Vector3();
    const colV = new THREE.Color();
    let placedN = 0;
    const maxTry = target * 3;
    /* stratified: fine grid over the chunk, jittered per cell ⇒ even coverage */
    const GCELL = CHUNK / Math.ceil(Math.sqrt(target));
    const nG = Math.ceil(CHUNK / GCELL);
    outer:
    for (let gx = 0; gx < nG; gx++) {
      for (let gz = 0; gz < nG; gz++) {
        if (placedN >= target) break outer;
        const jx = hash2(gx * 12.7 + cx * 5.1, gz * 7.9 + cz * 2.3);
        const jz = hash2(gz * 9.1 + cz * 6.7, gx * 4.3 + cx * 8.9);
        const wx = ox + (gx + jx) * GCELL;
        const wz = oz + (gz + jz) * GCELL;
        if (inWaterLocal(wx, wz, ctx) || !offRoadClear(wx, wz) || islandMask(wx, wz) > 0) continue;
        const b = biomeAt(wx, wz);
        if (!(b === 2 || b === 0)) continue;
        terrainNormalInto(nrmV, wx, wz, .8);
        dummy.position.set(wx, terrainH(wx, wz), wz);
        /* align +Y to the terrain normal via quaternion, then spin —
           this is the "fix the vectors" part: no floaters */
        _q.setFromUnitVectors(_upQ, nrmV);
        dummy.quaternion.copy(_q);
        dummy.rotateY(jx * Math.PI * 2);
        const gs = .78 + hash2(gx * 3.3, gz * 5.5) * .5;   // size variety
        dummy.scale.set(gs, .88 + hash2(gz * 2.2, gx * 6.6) * .42, gs);
        dummy.updateMatrix();
        const mesh = placedN % 2 ? grassB : grassA;
        mesh.setMatrixAt(Math.floor(placedN / 2), dummy.matrix);
        /* per-clump tint: SPATIALLY COHERENT dry↔lush meadow patches
           (bilinear-smoothed low-freq noise over world position) — never
           per-clump confetti. Multipliers stay near 1.0. */
        const cxw = Math.floor(wx / 24), czw = Math.floor(wz / 24);
        const fx = wx / 24 - cxw, fz = wz / 24 - czw;
        const sxx = fx * fx * (3 - 2 * fx), szz = fz * fz * (3 - 2 * fz);
        const h00 = hash2(cxw, czw), h10 = hash2(cxw + 1, czw);
        const h01 = hash2(cxw, czw + 1), h11 = hash2(cxw + 1, czw + 1);
        const dry = h00 + (h10 - h00) * sxx + (h01 - h00) * szz + (h00 - h01 - h10 + h11) * sxx * szz;
        colV.setRGB(
          .96 + dry * .17,          // dry patches go warm
          1.03 - dry * .06,
          .90 - dry * .16,          // …and lose blue
        );
        if (b === 0) colV.multiplyScalar(.92);             // snow biome: colder
        mesh.setColorAt(Math.floor(placedN / 2), colV);
        placedN++;
      }
    }
    dummy.rotation.set(0, 0, 0); dummy.quaternion.identity(); dummy.scale.setScalar(.001);
    for (let j = Math.ceil(placedN / 2); j < grassA.count; j++) {
      dummy.position.set(0, -50, 0); dummy.updateMatrix(); grassA.setMatrixAt(j, dummy.matrix);
      colV.setRGB(1, 1, 1); grassA.setColorAt(j, colV);
    }
    for (let j = Math.floor(placedN / 2); j < grassB.count; j++) {
      dummy.position.set(0, -50, 0); dummy.updateMatrix(); grassB.setMatrixAt(j, dummy.matrix);
      colV.setRGB(1, 1, 1); grassB.setColorAt(j, colV);
    }
    grassA.instanceMatrix.needsUpdate = true;
    grassB.instanceMatrix.needsUpdate = true;
    if (grassA.instanceColor) grassA.instanceColor.needsUpdate = true;
    if (grassB.instanceColor) grassB.instanceColor.needsUpdate = true;
    group.add(grassA, grassB);
  }

  /* ---------- lakes ---------- */
  {
    const lakeSeed = hash2(cx * 17.31, cz * 43.17);
    if (lakeSeed < .3) {
      const lx = ox + ((lakeSeed * 977) % 1 - .5) * CHUNK * .5;
      const lz = oz + (hash2(cx, cz * 91.7) - .5) * CHUNK * .5;
      const lr = 10 + hash2(cx * 3.3, cz * 7.1) * 14;
      if (roadDist(lx, lz) >= lr + 10) {           // lakes never swallow a road
        lakes.push({ x: lx, z: lz, r: lr });
        const lake = new THREE.Mesh(new THREE.CircleGeometry(lr, 32), mats.pond);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(lx, terrainH(lx, lz) + .12, lz);
        group.add(lake);
        /* reed ring */
        const REEDS = IS_MOBILE ? 32 : 56;
        const reedGeo = new THREE.ConeGeometry(.05, 1.4, 6);
        reedGeo.translate(0, .7, 0);
        const reeds = new THREE.InstancedMesh(reedGeo, mats.reed, REEDS);
        for (let i = 0; i < REEDS; i++) {
          const layer = i % 2;
          const a = (i / REEDS) * Math.PI * 2 + hash2(i, cx) * .25;
          const rr = lr + .6 + layer * 1.1 + hash2(i, cz) * 1.2;
          const px = lx + Math.sin(a) * rr, pz = lz + Math.cos(a) * rr;
          dummy.position.set(px, terrainH(px, pz), pz);
          dummy.rotation.set((hash2(i, 5) - .5) * .3, a, Math.sin(a) * (hash2(i, 9) > .5 ? .18 : -.18));
          const rs2 = .8 + hash2(i, 15) * .9;
          dummy.scale.set(rs2, rs2 * (layer ? .8 : 1.05), rs2);
          dummy.updateMatrix();
          reeds.setMatrixAt(i, dummy.matrix);
        }
        reeds.instanceMatrix.needsUpdate = true;
        group.add(reeds);
        /* lily pads */
        const NLILIES = 6 + Math.floor(hash2(cx * 5.5, cz * 8.8) * 5);
        const pads = new THREE.InstancedMesh(
          new THREE.CircleGeometry(1, 9),
          new THREE.MeshStandardMaterial({ color: 0x1e4d24, roughness: .85, side: THREE.DoubleSide }),
          NLILIES,
        );
        for (let i = 0; i < NLILIES; i++) {
          const a = hash2(i * 7.3 + cx, cz * 3.9) * Math.PI * 2;
          const rr = hash2(i * 2.1 + cz, cx * 6.7) * lr * .7;
          dummy.position.set(lx + Math.sin(a) * rr, terrainH(lx, lz) + .14, lz + Math.cos(a) * rr);
          dummy.rotation.set(-Math.PI / 2, 0, hash2(i, 97) * Math.PI * 2);
          dummy.scale.setScalar(.3 + hash2(i, 98) * .2);
          dummy.updateMatrix();
          pads.setMatrixAt(i, dummy.matrix);
        }
        pads.instanceMatrix.needsUpdate = true;
        group.add(pads);
        obstacles.push({ x: lx, z: lz, r: lr * .82 });
      }
    }
  }

  /* ---------- pickups (added to group; orchestrator reads world positions) ---------- */
  for (let i = 0; i < 3; i++) {
    const rr = hash2(cx * 13.37 + i * 7.7, cz * 71.7 + i * 3.1);
    if (rr > .5) continue;
    const px = ox + (hash2(i * 3.3 + cx, cz * 5.1) - .5) * CHUNK * .8;
    const pz = oz + (hash2(cz * 8.9 + i, cx * 2.7) - .5) * CHUNK * .8;
    if (inWaterLocal(px, pz, ctx) || !offRoadClear(px, pz) || islandMask(px, pz) > 0) continue;
    const roll = rr * 2;
    const kind: 'fuel' | 'coin' | 'crate' = roll < .18 ? 'fuel' : roll < .85 ? 'coin' : 'crate';
    let mesh: THREE.Object3D;
    if (kind === 'fuel') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .85, 12), mats.pickupFuel);
    } else if (kind === 'coin') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .1, 16), mats.pickupCoin);
      mesh.rotation.x = Math.PI / 2;
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(.95, .95, .95), mats.pickupCrate);
    }
    mesh.castShadow = true;
    mesh.position.set(px, terrainH(px, pz) + 1, pz);
    group.add(mesh);
    pickups.push({ mesh, kind });
  }

  return { group, cx, cz, obstacles, lakes };
}

/* ---------------- helpers needing ctx/lakeRects access ---------------- */
function inWaterLocal(x: number, z: number, ctx: ChunkBuildContext): boolean {
  return ctx.lakeRects.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 2);
}

/* small factories for road furniture (real Groups — they carry lights) */
import type { MaterialLibrary } from './types';
function lampFactory(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .11, 6.4, 8), mats.jeepDark);
  pole.position.y = 3.2; pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 1.5), mats.jeepDark);
  arm.position.set(0, 6.3, .75);
  g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.34, .12, .6), mats.headlightOn);
  head.position.set(0, 6.24, 1.45);
  g.add(head);
  const light = new THREE.PointLight(0xffd9a0, 20, 30, 1.8);
  light.position.set(0, 6.0, 1.45);
  g.add(light);
  return g;
}
function signFactory(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.2, 6), mats.jeepDark);
  pole.position.y = 1.1; pole.castShadow = true;
  g.add(pole);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.9, .62, .05), mats.headlightOn);
  panel.position.y = 1.9; panel.castShadow = true;
  g.add(panel);
  return g;
}

function lavaPoolAt(group: THREE.Group, wx: number, wz: number, mats: MaterialLibrary, obstacles: ChunkObstacle[]): void {
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.9, 16), mats.lava);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(wx, terrainH(wx, wz) + .06, wz);
  group.add(pool);
  const cr = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), mats.rockVolc);
  cr.position.set(wx + 1.7, terrainH(wx, wz) + .3, wz + .6);
  cr.castShadow = true;
  group.add(cr);
  const light = new THREE.PointLight(0xff5a1f, 1.6, 14);
  light.position.set(wx, terrainH(wx, wz) + .8, wz);
  group.add(light);
  obstacles.push({ x: wx, z: wz, r: 1.6 });
}
