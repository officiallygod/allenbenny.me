import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './Game.css';

/* ================================================================
   /game — "JEEP DRIFT" v2 — truly OPEN WORLD.
   - Unbounded in every direction: infinite chunked terrain
   - Real heightfield: dunes, snow drifts, hills, valleys
   - Car follows terrain height + tilts with slope
   - Sparse, non-clustered scatter via deterministic hashing
   - Vertex-coloured terrain: snow reads as snow, sand as sand
   ================================================================ */

type ChunkKey = string;
interface Chunk {
  group: THREE.Group;
  key: ChunkKey;
  cx: number;
  cz: number;
  obstacles: { x: number; z: number; r: number }[];
  lakes: { x: number; z: number; r: number }[];   // for lakeRects bookkeeping on dispose
}
interface Pickup {
  mesh: THREE.Object3D;
  kind: 'fuel' | 'coin' | 'crate';
}
interface Roller {
  mesh: THREE.Mesh;
  vx: number;
  vz: number;
}

const CHUNK = 90;          // metres per chunk
const SEG = 40;            // segments per chunk side
const VIEW_CHUNKS = 3;     // radius in chunks (7x7 loaded)
/* ---- bounded world: an 800x800 rectangle ---- */
const MAP_HALF = 400;
const MAX_CHUNK = Math.ceil(MAP_HALF / CHUNK);
/* every lake ever created (bounded map ⇒ finite); used to keep spawns dry */
const lakeRects: { x: number; z: number; r: number }[] = [];
function inWater(x: number, z: number): boolean {
  return lakeRects.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 2);
}
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* ---- Day-cycle presets (inspired by folio-2025 DayCycles) ---- */
const DAY_PRESETS = {
  day:   { light: 0xffd2c2, lightI: 2.2, hemiSky: 0xcfe4ff, hemiI: .9,  fogA: 0x9fd8ff, ambient: .28 },
  dusk:  { light: 0xff8181, lightI: 1.6, hemiSky: 0xffb9a0, hemiI: .65, fogA: 0xe89bb0, ambient: .2 },
  night: { light: 0x3240ff, lightI: 1.1, hemiSky: 0x27305c, hemiI: .4,  fogA: 0x14204a, ambient: .12 },
  dawn:  { light: 0xffa882, lightI: 1.8, hemiSky: 0xffd8c2, hemiI: .75, fogA: 0xf8c8e8, ambient: .22 },
} as const;
const DAY_ORDER = ['day', 'dusk', 'night', 'dawn'] as const;
/* cached preset colors — avoid allocating THREE.Color every frame */
const DAY_COL: Record<number, THREE.Color> = {};
for (const p of Object.values(DAY_PRESETS)) {
  for (const key of ['light', 'hemiSky', 'fogA'] as const) {
    if (!DAY_COL[p[key]]) DAY_COL[p[key]] = new THREE.Color(p[key]);
  }
}

const BIOMES = [
  { name: 'SNOW',     fog: 0xdfe9f2, skyDay: 0xbfd6ea, skyNight: 0x1a2534, hemiA: 0xcfe4ff, hemiB: 0xffffff },
  { name: 'DESERT',   fog: 0xf0dcae, skyDay: 0xf7dfae, skyNight: 0x241c2e, hemiA: 0xffe9c4, hemiB: 0xd9b26f },
  { name: 'MEADOW',   fog: 0xa8dba0, skyDay: 0xa5d8ff, skyNight: 0x18233a, hemiA: 0xbfe3ff, hemiB: 0x6fae52 },
  { name: 'VOLCANIC', fog: 0x4a3540, skyDay: 0x5a4050, skyNight: 0x140d14, hemiA: 0xff9d5c, hemiB: 0x33262e },
];

/* ---------------- deterministic noise ---------------- */
function hash2(x: number, y: number): number {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}
function smooth(t: number) { return t * t * (3 - 2 * t); }
function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x: number, y: number, oct = 4): number {
  let v = 0, amp = .5, f = 1;
  for (let i = 0; i < oct; i++) { v += amp * valueNoise(x * f, y * f); amp *= .5; f *= 2.03; }
  return v; // ~0..1
}

/* biome index from world position — huge slow blobs */
function biomeAt(x: number, z: number): number {
  const n = fbm(x * 0.0016 + 100, z * 0.0016 - 50, 3);
  return Math.min(3, Math.floor(n * 4));
}

/* ---------------- procedural ground detail textures (canvas) ---------------- */
function makeDetailTexture(
  base: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  draw(ctx, size);
  return cv;
}
function canvasToTexture(cv: HTMLCanvasElement, maxAniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

/* ---------------- biome minimap ---------------- */
const MINI_COLORS = ['#eef3f8', '#e8c88a', '#6aa84f', '#4a3540'];
function renderMinimap(ctx: CanvasRenderingContext2D, px: number, pz: number, heading: number) {
  const SIZE = 160, C = SIZE / 2;
  const RANGE = 5;                 // 11x11 samples
  const SPACING = 60;              // metres between samples
  const scale = (SIZE / 2 - 6) / (RANGE * SPACING);
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, C - 2, 0, Math.PI * 2);
  ctx.clip();
  for (let gx = -RANGE; gx <= RANGE; gx++) {
    for (let gz = -RANGE; gz <= RANGE; gz++) {
      const wx = Math.max(-MAP_HALF, Math.min(MAP_HALF, px + gx * SPACING));
      const wz = Math.max(-MAP_HALF, Math.min(MAP_HALF, pz + gz * SPACING));
      ctx.fillStyle = MINI_COLORS[biomeAt(wx, wz)];
      // north (-z) up on screen
      const sx = C + (wx - px) * scale;
      const sy = C + (wz - pz) * scale;
      const half = SPACING * scale / 2 + .5;
      ctx.fillRect(sx - half, sy - half, half * 2, half * 2);
    }
  }
  // draw the bounded-map edge as a white rectangle (clipped to the circle)
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(C + (-MAP_HALF - px) * scale, C + (-MAP_HALF - pz) * scale, MAP_HALF * 2 * scale, MAP_HALF * 2 * scale);
  // player triangle, rotated by heading (heading 0 => +z => down-screen)
  ctx.translate(C, C);
  ctx.rotate(-heading);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(20,25,35,.75)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* ---------------- terrain height field ---------------- */
function terrainH(x: number, z: number): number {
  // extremely smooth, barely noticeable undulation
  return (fbm(x * 0.006, z * 0.006, 3) - .5) * 1.1;
}
function terrainNormalInto(out: THREE.Vector3, x: number, z: number, e = .9) {
  const hl = terrainH(x - e, z), hr = terrainH(x + e, z);
  const hd = terrainH(x, z - e), hu = terrainH(x, z + e);
  out.set(hl - hr, 2 * e, hd - hu).normalize();
}

/* curved grass blade — rows bend toward +z so blades arc naturally */
function makeBladeGeo(): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(.14, .7, 1, 3);
  g.translate(0, .35, 0);   // root at y=0 (wind bend scales with height)
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, p.getY(i) * .15);   // tip arcs forward, root stays planted
  }
  g.computeVertexNormals();
  return g;
}

const GameApp: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef({ score: 0, distAcc: 0, px: 0, pz: 0, heading: Math.PI });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return Number(localStorage.getItem('jeepdrift-best')) || 0; } catch { return 0; }
  });
  const [speedKmh, setSpeedKmh] = useState(0);
  const [biomeName, setBiomeName] = useState('SNOW');
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const [toast, setToast] = useState('');
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1500);
  }, []);

  /* ================= ENGINE ================= */
  useEffect(() => {
    if (!started || !mountRef.current) return;
    const mount = mountRef.current;

    const renderer = new THREE.WebGLRenderer({
      antialias: !IS_MOBILE,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BIOMES[0].skyDay);
    scene.fog = new THREE.Fog(BIOMES[0].fog, 55, 210);

    const camera = new THREE.PerspectiveCamera(25, mount.clientWidth / mount.clientHeight, .1, 500);
    // folio-style isometric-ish rig
    const CAM = { phi: Math.PI * .34, theta: Math.PI * .25, radiusMin: 22, radiusMax: 46 };

    const hemi = new THREE.HemisphereLight(0xcfe4ff, 0xe8e2d4, .9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
    sun.position.set(50, 70, -35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(IS_MOBILE ? 1024 : 4096, IS_MOBILE ? 1024 : 4096);
    sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -.0004;
    sun.shadow.normalBias = .03;
    scene.add(sun);
    scene.add(sun.target);
    // faint cool fill from opposite side of the sun
    const fill = new THREE.DirectionalLight(0x8899ff, .25);
    fill.position.set(-50, 40, 35);
    scene.add(fill);
    const ambient = new THREE.AmbientLight(0xffffff, .28);
    scene.add(ambient);

    /* ---------- procedural ground detail textures (generated once) ---------- */
    const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
    const groundTex: THREE.CanvasTexture[] = [
      // SNOW — soft blotches of white / pale blue + faint sparkle
      canvasToTexture(makeDetailTexture('#f4f8ff', (ctx, s) => {
        for (let i = 0; i < 90; i++) {
          const r = 12 + Math.random() * 34;
          const g = ctx.createRadialGradient(
            Math.random() * s, Math.random() * s, 0,
            Math.random() * s, Math.random() * s, r);
          g.addColorStop(0, Math.random() < .5 ? 'rgba(255,255,255,.10)' : 'rgba(205,222,245,.08)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, s, s);
        }
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 140; i++) {
          ctx.globalAlpha = .1 + Math.random() * .25;
          ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
        }
        ctx.globalAlpha = 1;
      }), MAX_ANISO),
      // SAND — fine grain + wavy ripple bands
      canvasToTexture(makeDetailTexture('#e8d5a3', (ctx, s) => {
        for (let i = 0; i < 9000; i++) {
          const v = Math.random() * .3 - .13;
          ctx.fillStyle = `rgba(${v > 0 ? 255 : 60},${v > 0 ? 240 : 45},${v > 0 ? 200 : 20},${Math.abs(v) * .8})`;
          ctx.fillRect(Math.random() * s, Math.random() * s, 1.4, 1.4);
        }
        for (let y = -s; y < s * 2; y += 14 + Math.random() * 10) {
          ctx.strokeStyle = 'rgba(120,95,55,.07)';
          ctx.lineWidth = 2 + Math.random() * 2;
          ctx.beginPath();
          for (let x = 0; x <= s; x += 8) {
            const yy = y + Math.sin(x * .05 + y * .3) * 4;
            x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
      }), MAX_ANISO),
      // GRASS — thousands of tiny blade strokes in varied greens
      canvasToTexture(makeDetailTexture('#4c8a3f', (ctx, s) => {
        for (let i = 0; i < 7000; i++) {
          const h = 100 + Math.random() * 40;
          ctx.strokeStyle = `hsla(${h},${35 + Math.random() * 30}%,${22 + Math.random() * 26}%,.7)`;
          ctx.lineWidth = 1 + Math.random();
          const x = Math.random() * s, y = Math.random() * s;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - .5) * 2.5, y + 2 + Math.random() * 4);
          ctx.stroke();
        }
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = 'rgba(150,200,110,.06)';
          ctx.beginPath();
          ctx.arc(Math.random() * s, Math.random() * s, 14 + Math.random() * 24, 0, 7);
          ctx.fill();
        }
      }), MAX_ANISO),
      // VOLCANIC ash — dark charcoal blotches + faint cracks
      canvasToTexture(makeDetailTexture('#3a3038', (ctx, s) => {
        for (let i = 0; i < 70; i++) {
          const v = Math.random() < .6;
          ctx.fillStyle = v
            ? `rgba(15,10,16,${.08 + Math.random() * .12})`
            : `rgba(120,80,80,${.05 + Math.random() * .08})`;
          ctx.beginPath();
          ctx.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 30, 0, 7);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(10,7,12,.28)';
        for (let i = 0; i < 18; i++) {
          let x = Math.random() * s, y = Math.random() * s;
          ctx.lineWidth = .6 + Math.random();
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 6; k++) {
            x += (Math.random() - .5) * 34;
            y += (Math.random() - .5) * 34;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }), MAX_ANISO),
    ];
    /* per-biome terrain materials — cloned so each gets its own map */
    const terrMats = new Map<number, THREE.MeshStandardMaterial>();
    function terrainMat(biome: number): THREE.MeshStandardMaterial {
      let m = terrMats.get(biome);
      if (!m) {
        m = new THREE.MeshStandardMaterial({
          vertexColors: true, roughness: 1, metalness: 0,
          flatShading: biome === 3,
          map: groundTex[biome],
        });
        terrMats.set(biome, m);
      }
      return m;
    }

    /* ---------- shared materials ---------- */
    const M = {
      jeepBody: new THREE.MeshStandardMaterial({ color: 0xd84a2b, roughness: .55, metalness: .15 }),
      jeepDark: new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: .85 }),
      tire: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: .95 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xaad4e8, roughness: .12, metalness: .5 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x5e4128, roughness: .95 }),
      pineSnow: new THREE.MeshStandardMaterial({ color: 0x35604b, roughness: .92 }),
      pineGreen: new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: .92 }),
      pineDark: new THREE.MeshStandardMaterial({ color: 0x243d30, roughness: .95 }),
      cap: new THREE.MeshStandardMaterial({ color: 0xfdfeff, roughness: .85 }),
      rockGray: new THREE.MeshStandardMaterial({ color: 0x82898f, roughness: 1 }),
      rockVolc: new THREE.MeshStandardMaterial({ color: 0x46333d, roughness: 1 }),
      cactus: new THREE.MeshStandardMaterial({ color: 0x43804a, roughness: .9 }),
      deadBush: new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 1 }),
      lava: new THREE.MeshBasicMaterial({ color: 0xff5a1f }),
      fuel: new THREE.MeshStandardMaterial({ color: 0x35c24a, emissive: 0x1c8a2e, emissiveIntensity: .7, roughness: .35 }),
      coin: new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0xb08800, emissiveIntensity: .55, metalness: .75, roughness: .25 }),
      crate: new THREE.MeshStandardMaterial({ color: 0xffae00, emissive: 0x7a5200, emissiveIntensity: .5, metalness: .5, roughness: .3 }),
      rollerSnow: new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: .95 }),
      rollerSand: new THREE.MeshStandardMaterial({ color: 0xcaa05e, roughness: .95 }),
      flowerY: new THREE.MeshBasicMaterial({ color: 0xffe066 }),
      flowerP: new THREE.MeshBasicMaterial({ color: 0xff7ab8 }),
      grassMat: new THREE.MeshStandardMaterial({ color: 0x5da24e, roughness: .9, side: THREE.DoubleSide }),
      grassMat2: new THREE.MeshStandardMaterial({ color: 0x74b85a, roughness: .9, side: THREE.DoubleSide }),
      reedMat: new THREE.MeshStandardMaterial({ color: 0x8fae52, roughness: .9, side: THREE.DoubleSide }),
      treeLeafMat: new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: .92 }),
      treeLeafMatSnow: new THREE.MeshStandardMaterial({ color: 0x35604b, roughness: .92 }),
      waterMat: (() => {
        // animated ripple normal-ish effect via canvas texture, offset in loop
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const x = c.getContext('2d')!;
        x.fillStyle = '#2f7fb8'; x.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 260; i++) {
          const wx = Math.random() * 128, wy = Math.random() * 128;
          const wl = 6 + Math.random() * 14;
          x.strokeStyle = `rgba(255,255,255,${.05 + Math.random() * .12})`;
          x.lineWidth = 1 + Math.random();
          x.beginPath();
          x.moveTo(wx - wl / 2, wy);
          x.quadraticCurveTo(wx, wy - 2.5, wx + wl / 2, wy);
          x.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(4, 4);
        const m = new THREE.MeshStandardMaterial({
          map: t, color: 0x9fd4ef,
          roughness: .08, metalness: .5,
          transparent: true, opacity: .88,
        });
        (m as any).userData.map = t;
        return m;
      })(),
    };

    /* ---------- wind system ---------- */
    /* shared uniform object → one write per tick sways ALL grass/reeds/leaves.
       Bend is proportional to position.y above the root (tipness). */
    const windUniforms = { uTime: { value: 0 } };
    function windify(mat: THREE.Material, amp: number, freq: number, speed: number): void {
      // distinct cache key per param set — otherwise every windify closure has
      // the same toString() and three.js shares one program across them,
      // so only the first-compiled amp/freq/speed would actually apply.
      mat.customProgramCacheKey = () => `wind-${amp}-${freq}-${speed}`;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = windUniforms.uTime;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           transformed.x += sin(position.x * ${freq.toFixed(2)} + uTime * ${speed.toFixed(2)}) * ${amp.toFixed(3)} * position.y;
           transformed.z += cos(position.z * ${(freq * .8).toFixed(2)} + uTime * ${(speed * .7).toFixed(2)}) * ${amp.toFixed(3)} * position.y;`
        );
      };
    }
    windify(M.grassMat, .08, 1.3, 2);
    windify(M.grassMat2, .08, 1.3, 2);
    windify(M.reedMat, .07, 1.1, 1.8);
    windify(M.treeLeafMat, .06, .5, 1.5);
    windify(M.treeLeafMatSnow, .06, .5, 1.5);
    // water: gentle vertex bob instead of the generic sway
    {
      const mat = M.waterMat;
      mat.customProgramCacheKey = () => 'water-bob';
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = windUniforms.uTime;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           // radial fade via CircleGeometry uv: pin the rim to the shore so the
           // bobbing surface never separates from the terrain edge.
           float wEdge = 1.0 - smoothstep(0.62, 0.94, length(uv - 0.5) * 2.0);
           transformed.y += (sin(position.x * .8 + uTime * 1.2) * .05 + cos(position.z * .6 + uTime * .9) * .05) * wEdge;`
        );
      };
    }

    /* ---------- jeep — folio-2025 chunky offroader ---------- */
    const jeep = new THREE.Group();
    {
      const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: .5, metalness: .15 });
      const black = M.jeepDark;
      const darkGlass = new THREE.MeshStandardMaterial({ color: 0x11161c, roughness: .15, metalness: .4 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xd32f2f, emissiveIntensity: .3, roughness: .45 });
      const amber = new THREE.MeshStandardMaterial({ color: 0xffb300, emissive: 0xffb300, emissiveIntensity: 2 });
      const pinkTail = new THREE.MeshStandardMaterial({ color: 0xff2e88, emissive: 0xff2e88, emissiveIntensity: 2 });
      const ventDot = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 });

      // lower body slab
      const bodySlab = new THREE.Mesh(new THREE.BoxGeometry(2.3, .8, 3.8), red);
      bodySlab.position.y = .95; bodySlab.castShadow = true; jeep.add(bodySlab);
      // thin dark chamfer strip along the top edges of the body — fakes a bevel highlight
      const chamfer = new THREE.Mesh(new THREE.BoxGeometry(2.22, .07, 3.72), black);
      chamfer.position.y = 1.36; jeep.add(chamfer);
      // cabin block, set back
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, .75, 1.9), red);
      cabin.position.set(0, 1.72, -.55); cabin.castShadow = true; jeep.add(cabin);
      // dark glass band around cabin (slightly inset boxes)
      const glassBandF = new THREE.Mesh(new THREE.BoxGeometry(1.96, .42, .08), darkGlass);
      glassBandF.position.set(0, 1.82, .41); jeep.add(glassBandF);
      const glassBandB = new THREE.Mesh(new THREE.BoxGeometry(1.96, .42, .08), darkGlass);
      glassBandB.position.set(0, 1.82, -1.51); jeep.add(glassBandB);
      for (const gx of [-1.06, 1.06]) {
        const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(.06, .42, 1.76), darkGlass);
        sideGlass.position.set(gx, 1.82, -.55); jeep.add(sideGlass);
      }
      // fender flares over each wheel
      for (const [fx, fz] of [[-1.16, 1.28], [1.16, 1.28], [-1.16, -1.28], [1.16, -1.28]] as const) {
        const flare = new THREE.Mesh(new THREE.BoxGeometry(.18, .12, 1.3), black);
        flare.position.set(fx, 1.28, fz); flare.castShadow = true; jeep.add(flare);
      }
      // front bumper + amber headlights
      const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.3, .3, .22), black);
      bumperF.position.set(0, .72, 1.94); bumperF.castShadow = true; jeep.add(bumperF);
      for (const hx of [-.78, .78]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(.34, .22, .1), amber);
        hl.position.set(hx, .78, 2.02); jeep.add(hl);
      }
      // rear bumper + magenta taillights
      const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.3, .3, .22), black);
      bumperR.position.set(0, .72, -1.94); bumperR.castShadow = true; jeep.add(bumperR);
      for (let ti = 0; ti < 6; ti++) {
        const tailX = -0.9 + (ti % 3) * .9;
        const tailSide = ti < 3 ? -1.06 : 1.06;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .08), pinkTail);
        tail.position.set(tailSide === -1.06 ? tailX - .35 : tailX + .35, .8, -2.03);
        jeep.add(tail);
      }
      // roof rack: posts + perimeter rails
      for (const [px_, pz] of [[-.85, .35], [.85, .35], [-.85, -1.35], [.85, -1.35]] as const) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(.07, .18, .07), black);
        post.position.set(px_, 2.18, pz); jeep.add(post);
      }
      const rackFront = new THREE.Mesh(new THREE.BoxGeometry(1.85, .06, .07), black);
      rackFront.position.set(0, 2.3, .35); jeep.add(rackFront);
      const rackBack = new THREE.Mesh(new THREE.BoxGeometry(1.85, .06, .07), black);
      rackBack.position.set(0, 2.3, -1.35); jeep.add(rackBack);
      for (const rx_ of [-.92, .92]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(.07, .06, 1.77), black);
        rail.position.set(rx_, 2.3, -.5); jeep.add(rail);
      }
      // roof light bar with 4 amber cubes
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.7, .16, .18), black);
      lightBar.position.set(0, 2.44, .3); lightBar.castShadow = true; jeep.add(lightBar);
      for (let li = 0; li < 4; li++) {
        const lampCube = new THREE.Mesh(new THREE.BoxGeometry(.16, .12, .08), amber);
        lampCube.position.set(-.63 + li * .42, 2.44, .41); jeep.add(lampCube);
      }
      // small spoiler at rear roof edge
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, .07, .3), black);
      spoiler.position.set(0, 2.24, -1.62); spoiler.rotation.x = .28;
      spoiler.castShadow = true; jeep.add(spoiler);
      // hood scoop + vent dots on hood
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(.7, .14, .5), black);
      scoop.position.set(0, 1.46, 1.05); scoop.castShadow = true; jeep.add(scoop);
      for (let row = 0; row < 2; row++) {
        for (let v = 0; v < 4; v++) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 5), ventDot);
          dot.position.set((row ? .62 : .84), 1.36, .7 + v * .18); jeep.add(dot);
          const dot2 = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 5), ventDot);
          dot2.position.set(row ? -.62 : -.84, 1.36, .7 + v * .18); jeep.add(dot2);
        }
      }
      // black side skirts
      for (const sx of [-1.16, 1.16]) {
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(.1, .18, 1.3), black);
        skirt.position.set(sx, .68, 0); jeep.add(skirt);
      }
      // exhaust pipe rear
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .3, 8), M.tire);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(-.75, .55, -2.02); jeep.add(exhaust);
      // antenna with pink tip
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .8, 5), black);
      antenna.position.set(1.0, 2.25, -.4); antenna.rotation.z = -.12; jeep.add(antenna);
      const antTip = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 5), pinkTail);
      antTip.position.set(.952, 2.65, -.4); jeep.add(antTip);
      // spare wheel lying flat in cargo bed
      const spareGeo = new THREE.CylinderGeometry(.42, .42, .2, 14);
      const spare = new THREE.Mesh(spareGeo, M.tire);
      spare.position.set(0, 1.48, -1.35); spare.castShadow = true; jeep.add(spare);
      const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .21, 10), rimMat);
      spare.add(spareRim); jeep.add(spare);

      /* ---- detail extras: mirrors, skid plate, roof spare, wipers, handles, grille ---- */
      // side mirrors on short stalks
      for (const mx of [-1, 1]) {
        const stalk = new THREE.Mesh(new THREE.BoxGeometry(.16, .05, .05), black);
        stalk.position.set(mx * 1.18, 1.78, .38); jeep.add(stalk);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(.08, .22, .3), black);
        mirror.position.set(mx * 1.32, 1.82, .38); mirror.castShadow = true; jeep.add(mirror);
      }
      // front skid plate: angled thin box under the front bumper
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.9, .06, .6), black);
      skid.position.set(0, .48, 1.85); skid.rotation.x = -.35;
      skid.castShadow = true; jeep.add(skid);
      // roof-mounted spare tire on a small rack
      const roofSpare = new THREE.Mesh(new THREE.TorusGeometry(.32, .11, 8, 16), M.tire);
      roofSpare.rotation.x = Math.PI / 2;
      roofSpare.position.set(-.45, 2.4, -.9); roofSpare.castShadow = true; jeep.add(roofSpare);
      const roofHub = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .1, 10), rimMat);
      roofHub.position.copy(roofSpare.position); jeep.add(roofHub);
      for (const [rx2, rz2] of [[-.72, -1.12], [-.18, -1.12], [-.72, -.68], [-.18, -.68]] as const) {
        const rackPost = new THREE.Mesh(new THREE.BoxGeometry(.05, .12, .05), black);
        rackPost.position.set(rx2, 2.34, rz2); jeep.add(rackPost);
      }
      // windshield wipers: two thin dark boxes on the front glass
      for (const wx2 of [-.45, .45]) {
        const wiper = new THREE.Mesh(new THREE.BoxGeometry(.55, .03, .04), black);
        wiper.position.set(wx2, 1.62, .47); wiper.rotation.z = .5;
        jeep.add(wiper);
      }
      // door handles: 4 tiny dark boxes
      for (const hx2 of [-1.13, 1.13]) {
        for (const hz2 of [.75, -.75]) {
          const handle = new THREE.Mesh(new THREE.BoxGeometry(.05, .07, .26), black);
          handle.position.set(hx2, 1.28, hz2); jeep.add(handle);
        }
      }
      // front grille between headlights: dark box with 5 vertical slats
      const grille = new THREE.Mesh(new THREE.BoxGeometry(.86, .24, .08), black);
      grille.position.set(0, .78, 2.0); jeep.add(grille);
      for (let sI = 0; sI < 5; sI++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(.04, .2, .04), M.tire);
        slat.position.set(-.32 + sI * .16, .78, 2.05); jeep.add(slat);
      }
    }
    const wheels: THREE.Mesh[] = [];
    const wheelContainers: THREE.Group[] = [];
    // folio-style: bake the axle into the geometry (along X), then
    //   container.rotation.y = steering,  mesh.rotation.x = rolling spin
    const rimMatWheel = new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xd32f2f, emissiveIntensity: .3, roughness: .45 });
    for (const [wx, wz, side] of [[-1.08, 1.28, -1], [1.08, 1.28, 1], [-1.08, -1.28, -1], [1.08, -1.28, 1]] as const) {
      const container = new THREE.Group();
      container.position.set(wx, .58, wz);
      const tireGeo = new THREE.CylinderGeometry(.58, .58, .44, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const w = new THREE.Mesh(tireGeo, M.tire);
      w.castShadow = true;
      container.add(w);
      // red rim disc on the outer face
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .46, 24), rimMatWheel);
      rim.geometry.rotateZ(Math.PI / 2);
      rim.position.x = side * .01;
      w.add(rim);
      jeep.add(container);
      wheels.push(w);
      wheelContainers.push(container);
    }
    const headBeam = new THREE.SpotLight(0xfff3c4, 55, 45, Math.PI / 7, .55, 1.6);
    headBeam.position.set(0, 1.3, 1.8);
    const beamTarget = new THREE.Object3D();
    beamTarget.position.set(0, 0, 22);
    jeep.add(beamTarget);
    headBeam.target = beamTarget;
    jeep.add(headBeam);
    // soft contact shadow under the jeep (always readable)
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(2, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    scene.add(blob);
    scene.add(jeep);

    /* ---------- chunk system ---------- */
    const chunks = new Map<ChunkKey, Chunk>();
    const pickups: Pickup[] = [];
    const rollers: Roller[] = [];

    /* ---- butterflies: cheap ambient life in meadow chunks ---- */
    interface Butterfly { group: THREE.Group; wings: THREE.Mesh[]; base: THREE.Vector3; phase: number }
    const butterflies: Butterfly[] = [];
    function spawnButterfly(x: number, z: number): void {
      const g = new THREE.Group();
      const wingGeo = new THREE.PlaneGeometry(.24, .17);
      wingGeo.translate(.12, 0, 0);   // hinge at body so rotation.y flaps around it
      const wMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
      const wl = new THREE.Mesh(wingGeo, wMat);
      const wr = new THREE.Mesh(wingGeo, wMat); wr.rotation.y = Math.PI;
      g.add(wl, wr);
      g.position.set(x, terrainH(x, z) + 1, z);
      scene.add(g);
      butterflies.push({ group: g, wings: [wl, wr], base: new THREE.Vector3(x, terrainH(x, z), z), phase: Math.random() * 20 });
    }

    const dummy = new THREE.Object3D();

    function buildChunk(cx: number, cz: number): Chunk {
      const group = new THREE.Group();
      const ox = cx * CHUNK, oz = cz * CHUNK;
      const obstacles: { x: number; z: number; r: number }[] = [];
      const lakes: { x: number; z: number; r: number }[] = [];
      const b0 = biomeAt(ox + CHUNK / 2, oz + CHUNK / 2);   // chunk-dominant biome

      /* --- terrain mesh with vertex colours --- */
      const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, SEG, SEG);
      geo.rotateX(-Math.PI / 2);
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const colors = new Float32Array(posAttr.count * 3);
      const col = new THREE.Color();
      for (let i = 0; i < posAttr.count; i++) {
        const wx = posAttr.getX(i) + ox;
        const wz = posAttr.getZ(i) + oz;
        const h = terrainH(wx, wz);
        // micro-relief: high-frequency undulation for vertex placement ONLY
        // (physics still uses the smooth terrainH function)
        const microN = valueNoise(wx * .15, wz * .15);
        posAttr.setY(i, h + (microN - .5) * .35);

        const b = biomeAt(wx, wz);
        const slopeN = new THREE.Vector3();
        terrainNormalInto(slopeN, wx, wz, 1.4);
        const steep = 1 - slopeN.y;

        if (b === 0) {         // SNOW — clean bright white-blue
          const dip = THREE.MathUtils.clamp((-h + 2) / 6, 0, 1);
          col.setRGB(.96 - dip * .06, .98 - dip * .07, 1);
        } else if (b === 1) {  // SAND — soft warm beige
          const t = THREE.MathUtils.clamp((h + 4) / 14, 0, 1);
          col.setRGB(.93 - t * .05, .84 - t * .04, .62 + t * .05);
        } else if (b === 3) {  // VOLCANIC — charcoal with warm ember lows
          const low = THREE.MathUtils.clamp((-h + 1) / 5, 0, 1);
          col.setRGB(.3 + low * .18, .26 + low * .08, .28);
        } else {               // MEADOW — fresh natural grass
          const g = fbm(wx * .08, wz * .08, 2);
          col.setRGB(.42 + g * .14, .68 + g * .12, .38 + g * .08);
        }
        if (steep > .28 && b !== 3) {  // rocky slopes
          const t = Math.min(1, (steep - .28) * 3);
          col.lerp(new THREE.Color(b === 0 ? 0xb8c2cc : 0x9a8a6a), t);
        }
        // texture provides most detail — lighten vertex colours toward white
        // (three multiplies map x vertexColor), clamped to 1
        // subtle per-vertex brightness variation from the same micro noise
        const shade = 1 + (valueNoise(wx * .15 + 40, wz * .15 - 40) - .5) * .08;
        col.multiplyScalar(shade);
        col.r = Math.min(1, col.r * 1.6);
        col.g = Math.min(1, col.g * 1.6);
        col.b = Math.min(1, col.b * 1.6);
        colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const terr = new THREE.Mesh(geo, terrainMat(biomeAt(ox, oz)));
      terr.position.set(ox, 0, oz);
      terr.receiveShadow = true;
      group.add(terr);

      /* --- tiny pebbles: one InstancedMesh, 40 half-buried dodecas per chunk --- */
      {
        const pebGeo = new THREE.DodecahedronGeometry(1, 0);
        const pebbles = new THREE.InstancedMesh(pebGeo, b0 === 3 ? M.rockVolc : M.rockGray, 40);
        for (let i = 0; i < 40; i++) {
          const px = ox + (hash2(i * 2.9 + cx * 3.7, cz * 5.1) - .5) * CHUNK;
          const pz = oz + (hash2(cz * 6.3 + i * 1.7, cx * 4.9) - .5) * CHUNK;
          dummy.position.set(px, terrainH(px, pz) + .02, pz);
          dummy.rotation.set(hash2(i, 91) * 3, hash2(i, 92) * 3, hash2(i, 93) * 3);
          const ps = .06 + hash2(i, 94) * .09;
          dummy.scale.setScalar(ps);
          dummy.updateMatrix();
          pebbles.setMatrixAt(i, dummy.matrix);
        }
        pebbles.instanceMatrix.needsUpdate = true;
        group.add(pebbles);
      }

      /* --- meadow flower field: instanced heads in yellow/pink/white mix --- */
      if (b0 === 2) {
        const headGeo = new THREE.SphereGeometry(.07, 6, 5);
        const FLOWERS = 60;
        const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), FLOWERS);
        const fc = new THREE.Color();
        for (let i = 0; i < FLOWERS; i++) {
          const fx = ox + (hash2(i * 3.7 + cx * 8.1, cz * 2.3) - .5) * CHUNK;
          const fz = oz + (hash2(cz * 4.7 + i * 5.3, cx * 6.1) - .5) * CHUNK;
          if (!inWater(fx, fz)) {
            dummy.position.set(fx, terrainH(fx, fz) + .18, fz);
          }
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(.8 + hash2(i, 95) * .5);
          dummy.updateMatrix();
          heads.setMatrixAt(i, dummy.matrix);
          // yellow / pink / white mix
          const roll = hash2(i, 96);
          fc.set(roll < .4 ? 0xffe066 : roll < .75 ? 0xff7ab8 : 0xffffff);
          heads.setColorAt(i, fc);
        }
        heads.instanceMatrix.needsUpdate = true;
        if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
        group.add(heads);
      }

      /* --- sparse scatter (deterministic, non-clustered) ---
         Poisson-ish: fixed jittered grid, hash decides presence/type */
      const CELL = 14;
      const nCells = Math.floor(CHUNK / CELL);
      for (let gx = 0; gx < nCells; gx++) {
        for (let gz = 0; gz < nCells; gz++) {
          const rx = hash2(ox / CELL + gx * 7.13, oz / CELL + gz * 3.71);
          const rz = hash2(ox / CELL + gx * 2.17, oz / CELL + gz * 9.31);
          const pick = hash2(gx * 31.7 + cx * 91.3, gz * 17.9 + cz * 57.1);
          const wx = ox + gx * CELL + rx * CELL;
          const wz = oz + gz * CELL + rz * CELL;
          if (inWater(wx, wz)) continue;              // never scatter into lakes
          const b = biomeAt(wx, wz);
          const density = b === 0 ? .34 : b === 1 ? .3 : b === 3 ? .3 : .42;
          if (pick > density) continue;

          const h = terrainH(wx, wz);
          let obj: THREE.Object3D | null = null;
          let r = 1.2;

          if (b === 0) {
            // snow: DENSE pine forests — grove cells fill ~55-65% with trees
            const grove = hash2(gx * 3.1 + cx, gz * 5.7 + cz);
            if (grove < .62 && pick < .55) { obj = makePine(M.treeLeafMatSnow, M.cap, true); r = 1.4; }
            else if (pick < .6) { obj = makeRock(M.rockGray); r = 1.2; }
            else if (pick < .68) { obj = makeSnowPile(); r = 1.1; }
            else continue;
          } else if (b === 1) {
            if (pick < .14) { obj = makeCactus(); r = .9; }
            else if (pick < .24) { obj = makeRock(M.rockGray); r = 1.3; }
            else if (pick < .32) { obj = makeDeadBush(); r = .7; }
            else continue;
          } else if (b === 3) {
            if (pick < .16) { obj = makeLavaPool(); r = 1.6; }
            else if (pick < .4) { obj = makeRock(M.rockVolc); r = 1.5; }
            else continue;
          } else {
            // meadow: DENSE mixed woods — pines AND broadleaf groves
            const grove = hash2(gx * 7.9 + cz, gz * 2.3 + cx);
            if (grove < .45 && pick < .45) { obj = makePine(M.treeLeafMat, null, false); r = 1.4; }
            else if (grove < .75 && pick < .58) { obj = makeBroadleaf(); r = 1.5; }
            else if (pick < .64) { obj = makeRock(M.rockGray); r = 1.1; }
            else continue;
          }
          if (!obj) continue;
          obj.position.set(wx, h, wz);
          obj.rotation.y = rx * Math.PI * 2;
          const s = .8 + rz * .7;
          if (r > 0) { obj.scale.setScalar(s); obstacles.push({ x: wx, z: wz, r: r * s }); }
          group.add(obj);
        }
      }

      /* --- DENSE FOREST pass: a second, finer grid (CELL 9) just for trees.
         Grove noise decides where forests go; inside groves ~60% of cells
         get a tree, so woods read as thick forest, not scattered props. --- */
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
            if (inWater(wx, wz)) continue;
            const grove = b0 === 0
              ? hash2(gx * 3.1 + cx, gz * 5.7 + cz)
              : Math.max(hash2(gx * 7.9 + cz, gz * 2.3 + cx), hash2(gx * 5.3 - cz, gz * 9.1 + cx));
            if (grove > .62 || pick > .6) continue;   // ~60% fill inside groves
            const h = terrainH(wx, wz);
            // 8% of grove cells: a fallen log instead of a standing tree
            const obj = hash2(wx * 1.31, wz * 2.73) < .08
              ? makeFallenLog()
              : b0 === 0
                ? makePine(M.treeLeafMatSnow, M.cap, true)
                : (pick < .3 ? makePine(M.treeLeafMat, null, false) : makeBroadleaf());
            obj.position.set(wx, h, wz);
            obj.rotation.y = rx * Math.PI * 2;
            const s = .75 + rz * .6;
            obj.scale.setScalar(s);
            obstacles.push({ x: wx, z: wz, r: 1.45 * s });
            group.add(obj);
          }
        }
      }

      /* --- instanced grass blades (meadow) / tufts (others) ---
         one InstancedMesh per chunk = 1 draw call for hundreds of blades */
      if (b0 === 2 || b0 === 0) {
        const bladeCount = b0 === 2 ? 500 : 180;
        // camera-agnostic plane blades (doubleSide), root at y=0 so the
        // windify shader bend scales with height above the root
        const gGeo = makeBladeGeo();
        // two-tone grass: alternate between two greens via two meshes
        const grassA = new THREE.InstancedMesh(gGeo, M.grassMat, Math.ceil(bladeCount / 2));
        const grassB = new THREE.InstancedMesh(gGeo, M.grassMat2, bladeCount - Math.ceil(bladeCount / 2));
        let placed = 0;
        for (let i = 0; i < bladeCount * 2 && placed < bladeCount; i++) {
          const gx = ox + (hash2(i * 1.7 + cx, cz * 3.1) - .5) * CHUNK;
          const gz = oz + (hash2(cz * 5.3 + i, cx * 7.7) - .5) * CHUNK;
          if (inWater(gx, gz)) continue;              // no blades inside lakes
          dummy.position.set(gx, terrainH(gx, gz), gz);   // base exactly on ground
          // gentle uniform lean (≤.2 rad) — planted, not splayed
          dummy.rotation.set((hash2(i, 11) - .5) * .2, hash2(i, 22) * 6.28, (hash2(i, 33) - .5) * .2);
          const gs = .8 + hash2(i, 44) * .35;         // low variance → no stick look
          dummy.scale.set(1, gs, 1);
          dummy.updateMatrix();
          ((placed % 2 ? grassB : grassA) as THREE.InstancedMesh).setMatrixAt(Math.floor(placed / 2), dummy.matrix);
          placed++;
        }
        // park unused tail instances far below ground
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.001);
        for (let j = Math.ceil(placed / 2); j < grassA.count; j++) {
          dummy.position.set(0, -50, 0); dummy.updateMatrix(); grassA.setMatrixAt(j, dummy.matrix);
        }
        for (let j = Math.floor(placed / 2); j < grassB.count; j++) {
          dummy.position.set(0, -50, 0); dummy.updateMatrix(); grassB.setMatrixAt(j, dummy.matrix);
        }
        grassA.instanceMatrix.needsUpdate = true;
        grassB.instanceMatrix.needsUpdate = true;
        group.add(grassA, grassB);
      }

      /* --- water lakes: shallow blue disc where noise says so --- */
      {
        const lakeSeed = hash2(cx * 17.31, cz * 43.17);
        if (lakeSeed < .3) {
          const lx = ox + (lakeSeed * 977 % 1 - .5) * CHUNK * .5;
          const lz = oz + (hash2(cx, cz * 91.7) - .5) * CHUNK * .5;
          const lr = 10 + hash2(cx * 3.3, cz * 7.1) * 14;
          // register the lake so nothing (grass/trees/pickups) spawns in it;
          // same object goes into the chunk's lakes[] for removal on dispose
          const lakeRect = { x: lx, z: lz, r: lr };
          lakeRects.push(lakeRect);
          lakes.push(lakeRect);
          // flatten terrain visually with a water disc slightly above ground
          const lake = new THREE.Mesh(new THREE.CircleGeometry(lr, 32), M.waterMat);
          lake.rotation.x = -Math.PI / 2;
          lake.position.set(lx, terrainH(lx, lz) + .12, lz);
          group.add(lake);
          // reeds: FULL circumference ring, two layers, slight sway baked in
          const REEDS = 64;
          const reeds = new THREE.InstancedMesh(
            (() => { const g = new THREE.ConeGeometry(.05, 1.4, 6); g.translate(0, .7, 0); return g; })(),
            M.reedMat,
            REEDS
          );
          for (let i = 0; i < REEDS; i++) {
            const layer = i % 2;
            const a = (i / REEDS) * Math.PI * 2 + hash2(i, cx) * .25;
            const rr = lr + .6 + layer * 1.1 + hash2(i, cz) * 1.2;
            const px = lx + Math.sin(a) * rr, pz = lz + Math.cos(a) * rr;
            dummy.position.set(px, terrainH(px, pz), pz);
            // lean outward from water + jitter
            dummy.rotation.set((hash2(i, 5) - .5) * .3, a, Math.sin(a) * (hash2(i, 9) > .5 ? .18 : -.18));
            const rs = .8 + hash2(i, 15) * .9;
            dummy.scale.set(rs, rs * (layer ? .8 : 1.05), rs);
            dummy.updateMatrix();
            reeds.setMatrixAt(i, dummy.matrix);
          }
          reeds.instanceMatrix.needsUpdate = true;
          group.add(reeds);

          /* --- lily pads: flat dark-green discs floating on the surface --- */
          {
            const NLILIES = 6 + Math.floor(hash2(cx * 5.5, cz * 8.8) * 5);   // 6-10
            const padGeo = new THREE.CircleGeometry(1, 9);
            const pads = new THREE.InstancedMesh(padGeo,
              new THREE.MeshStandardMaterial({ color: 0x1e4d24, roughness: .85, side: THREE.DoubleSide }),
              NLILIES);
            for (let i = 0; i < NLILIES; i++) {
              const a = hash2(i * 7.3 + cx, cz * 3.9) * Math.PI * 2;
              const rr = hash2(i * 2.1 + cz, cx * 6.7) * lr * .7;
              dummy.position.set(lx + Math.sin(a) * rr, terrainH(lx, lz) + .14, lz + Math.cos(a) * rr);
              dummy.rotation.set(-Math.PI / 2, 0, hash2(i, 97) * Math.PI * 2);
              const ls = .3 + hash2(i, 98) * .2;
              dummy.scale.setScalar(ls);
              dummy.updateMatrix();
              pads.setMatrixAt(i, dummy.matrix);
            }
            pads.instanceMatrix.needsUpdate = true;
            group.add(pads);
          }

          /* lakes are soft obstacles — slow bounce, no damage feel */
          obstacles.push({ x: lx, z: lz, r: lr * .82 });
          lakes.push({ x: lx, z: lz, r: lr });
        }
      }

      /* --- pickups: rare, along nothing particular --- */
      for (let i = 0; i < 3; i++) {
        const rr = hash2(cx * 13.37 + i * 7.7, cz * 71.7 + i * 3.1);
        if (rr > .5) continue;
        const px = ox + (hash2(i * 3.3 + cx, cz * 5.1) - .5) * CHUNK * .8;
        const pz = oz + (hash2(cz * 8.9 + i, cx * 2.7) - .5) * CHUNK * .8;
        if (inWater(px, pz)) continue;                // no pickups in lakes
        const roll = rr * 2;
        const kind: Pickup['kind'] = roll < .18 ? 'fuel' : roll < .85 ? 'coin' : 'crate';
        let mesh: THREE.Object3D;
        if (kind === 'fuel') {
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .85, 12), M.fuel);
        } else if (kind === 'coin') {
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .1, 16), M.coin);
          mesh.rotation.x = Math.PI / 2;
        } else {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(.95, .95, .95), M.crate);
        }
        mesh.castShadow = true;
        mesh.position.set(px, terrainH(px, pz) + 1, pz);
        scene.add(mesh);
        pickups.push({ mesh, kind });
      }

      scene.add(group);
      return { group, key: `${cx},${cz}`, cx, cz, obstacles, lakes };
    }

    function makePine(leafMat: THREE.Material, capMat: THREE.Material | null, snowy: boolean) {
          const g = new THREE.Group();
          const t = new THREE.Mesh(new THREE.CylinderGeometry(.16, .38, 1.6, 10), M.trunk);
          t.position.y = .8; t.castShadow = true; g.add(t);
          // small branch cylinders poking out of the trunk
          for (let br = 0; br < 3; br++) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, .9, 5), M.trunk);
            branch.position.set(0, .6 + br * .45, 0);
            branch.rotation.z = 1.1 + hash2(br, 3) * .3;
            branch.rotation.y = br * 2.4 + hash2(br, 9) * 1.5;
            branch.translateY(.45);
            g.add(branch);
          }
          for (let i = 0; i < 5; i++) {
            const rad = 1.75 - i * .32;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, 1.35, 12),
              snowy ? (i === 0 ? leafMat : M.pineDark) : leafMat);
            cone.position.y = 1.7 + i * .92; cone.castShadow = true;
            cone.rotation.y = i * .5;                       // break up silhouette repetition
            cone.rotation.z = (hash2(i, 13) - .5) * .12;    // slight droop per tier
            g.add(cone);
            if (capMat && snowy) {
              const c = new THREE.Mesh(new THREE.ConeGeometry(rad * .68, .5, 12), capMat);
              c.position.y = 1.7 + i * .92 + .58; g.add(c);
            }
          }
          return g;
        }
        /* broadleaf tree — meadow groves */
        function makeBroadleaf() {
          const g = new THREE.Group();
          const t = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 2, 7), M.trunk);
          t.position.y = 1; t.castShadow = true; g.add(t);
          // visible branches reaching from trunk into the canopy
          for (let br = 0; br < 3; br++) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(.05, .09, 1.5, 5), M.trunk);
            branch.position.y = 1.3 + br * .3;
            branch.rotation.z = .8 + hash2(br, 21) * .4;
            branch.rotation.y = br * 2.1 + hash2(br, 31) * 1.2;
            branch.translateY(.75);
            g.add(branch);
          }
          const canopy = new THREE.Group();
          canopy.position.y = 2.6;
          const NPUFFS = 6 + Math.floor(hash2(77, 5) * 3);   // 6-8 puffs
          for (let i = 0; i < NPUFFS; i++) {
            const pr = .7 + hash2(i, 7) * .55;
            const puffGeo = new THREE.IcosahedronGeometry(pr, 2);
            puffGeo.translate(0, pr, 0);   // base at y=0 → wind bends tips only, never shears the puff apart
            puffGeo.scale(1, .85, 1);      // organic squashed-sphere canopy
            const puff = new THREE.Mesh(puffGeo, M.treeLeafMat);
            puff.position.set((hash2(i, 1) - .5) * 1.8, (hash2(i, 2) - .5) * 1.2 - pr * .5, (hash2(i, 3) - .5) * 1.8);
            puff.castShadow = true;
            canopy.add(puff);
          }
          // tiny fruit / flower dots scattered on the canopy for close-up interest
          for (let f = 0; f < 5; f++) {
            const dot = new THREE.Mesh(
              new THREE.SphereGeometry(.07, 6, 5),
              f % 2 ? M.flowerP : M.flowerY
            );
            const a = hash2(f, 41) * Math.PI * 2, rr = .8 + hash2(f, 43) * .9;
            dot.position.set(Math.sin(a) * rr, .6 + hash2(f, 47) * 1.4, Math.cos(a) * rr);
            canopy.add(dot);
          }
          g.add(canopy);
          return g;
        }
        /* fallen log — replaces some grove trees */
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x4f7038, roughness: .95 });
        function makeFallenLog() {
          const g = new THREE.Group();
          const log = new THREE.Mesh(new THREE.CylinderGeometry(.28, .34, 2.6, 10), M.trunk);
          log.rotation.z = Math.PI / 2;
          log.rotation.y = hash2(3, 3) * Math.PI;
          log.position.y = .32; log.castShadow = true; g.add(log);
          // moss-coloured end caps
          const capGeo = new THREE.CircleGeometry(.3, 10);
          for (const s of [-1, 1]) {
            const cap = new THREE.Mesh(capGeo, mossMat);
            cap.position.set(s * 1.3, .32, 0);
            cap.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
            g.add(cap);
          }
          return g;
        }
        function makeRock(mat: THREE.Material) {
          const g = new THREE.Group();
          // 30% of rocks become 2-3 rock clusters (half-buried, varied size)
          if (Math.random() < .3) {
            const n = 2 + Math.floor(hash2(23, 5) * 2);
            for (let i = 0; i < n; i++) {
              const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.55 + hash2(i, 61) * .65, 1), mat);
              r.castShadow = true;
              r.position.set((hash2(i, 63) - .5) * 1.6, .15 + hash2(i, 67) * .25, (hash2(i, 71) - .5) * 1.6);
              r.rotation.set(hash2(i, 73) * 3, hash2(i, 79) * 3, hash2(i, 83) * 3);
              g.add(r);
            }
          } else {
            const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), mat);
            r.castShadow = true;
            r.position.y = .3;
            g.add(r);
          }
          return g;
        }
    function makeSnowPile() {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), M.cap);
      s.scale.y = .45; s.position.y = .1; s.receiveShadow = true;
      const g = new THREE.Group(); g.add(s);
      return g;
    }
    function makeCactus() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.34, .4, 2.8, 9), M.cactus);
      body.position.y = 1.4; body.castShadow = true; g.add(body);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, 1.15, 7), M.cactus);
      arm.position.set(.6, 1.7, 0); arm.rotation.z = -.85; arm.castShadow = true; g.add(arm);
      const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(.17, .19, .9, 7), M.cactus);
      arm2.position.set(-.52, 2.05, 0); arm2.rotation.z = .95; g.add(arm2);
      return g;
    }
    function makeDeadBush() {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, 1, 5), M.deadBush);
        st.position.set(Math.sin(i * 2.4) * .18, .45, Math.cos(i * 2.4) * .18);
        st.rotation.set(Math.sin(i) * .5, 0, Math.cos(i) * .5);
        g.add(st);
      }
      return g;
    }
    function makeLavaPool() {
      const g = new THREE.Group();
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1.9, 14), M.lava);
      pool.rotation.x = -Math.PI / 2; pool.position.y = .06; g.add(pool);
      const cr = new THREE.Mesh(new THREE.DodecahedronGeometry(.9, 0), M.rockVolc);
      cr.position.set(1.7, .3, .6); cr.castShadow = true; g.add(cr);
      const light = new THREE.PointLight(0xff5a1f, 1.6, 14);
      light.position.y = .8; g.add(light);
      return g;
    }
    function makeFlowerPatch() {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Mesh(
          new THREE.SphereGeometry(.09, 6, 5),
          i % 2 ? M.flowerY : M.flowerP
        );
        f.position.set((hash2(i, 1) - .5) * 1.6, .12, (hash2(i, 2) - .5) * 1.6);
        g.add(f);
      }
      return g;
    }

    function ensureChunksAround(pcx: number, pcz: number) {
      // bounded world: never build chunks outside the ±MAP_HALF rectangle
      const cMin = -MAX_CHUNK, cMax = MAX_CHUNK;
      for (let dx = -VIEW_CHUNKS; dx <= VIEW_CHUNKS; dx++) {
        for (let dz = -VIEW_CHUNKS; dz <= VIEW_CHUNKS; dz++) {
          const bx = Math.min(cMax, Math.max(cMin, pcx + dx));
          const bz = Math.min(cMax, Math.max(cMin, pcz + dz));
          const k = `${bx},${bz}`;
          if (!chunks.has(k)) chunks.set(k, buildChunk(bx, bz));
        }
      }
      for (const [k, c] of chunks) {
        if (Math.abs(c.cx - pcx) > VIEW_CHUNKS + 1 || Math.abs(c.cz - pcz) > VIEW_CHUNKS + 1) {
          scene.remove(c.group);
          // drop this chunk's lakes from the global registry (bounded map stays consistent)
          for (const l of c.lakes) {
            const idx = lakeRects.indexOf(l);
            if (idx !== -1) lakeRects.splice(idx, 1);
          }
          c.group.traverse(o => {
            if ((o as THREE.Mesh).isMesh) {
              ((o as THREE.Mesh).geometry)?.dispose?.();
            }
          });
          chunks.delete(k);
        }
      }
    }

    /* ---------- state ---------- */
    const pos = new THREE.Vector3(0, terrainH(0, 0), 0);
    const vel = new THREE.Vector3();
    const keys: Record<string, boolean> = {};
    let heading = Math.PI;
    let steer = 0;
    let lastT = performance.now();
    let running = true;
    let raf = 0;
    let lastBiomeIdx = -1;

    ensureChunksAround(0, 0);

    /* ---------- folio-style "hero grass": one dense patch that FOLLOWS the player ----------
       600 blades in a 40x40 patch; the group snaps to a 4m grid near the jeep and
       blades re-scatter deterministically by hashed world position → dense grass
       everywhere near the player without per-frame instance rewrites. */
    const HERO_N = 600, HERO_R = 20;
    const heroGeo = makeBladeGeo();
    const heroA = new THREE.InstancedMesh(heroGeo, M.grassMat2, Math.ceil(HERO_N / 2));
    const heroB = new THREE.InstancedMesh(heroGeo, M.grassMat, Math.floor(HERO_N / 2));
    const heroGroup = new THREE.Group();
    heroGroup.add(heroA, heroB);
    scene.add(heroGroup);
    let heroSnapX = 1e9, heroSnapZ = 1e9;
    function scatterHero(hx: number, hz: number) {
      let placed = 0;
      for (let i = 0; i < HERO_N * 2 && placed < HERO_N; i++) {
        const wx = hx + (hash2(i * 1.7 + hx * .37, hz * 3.1) - .5) * HERO_R * 2;
        const wz = hz + (hash2(hz * 5.3 + i, hx * 7.7) - .5) * HERO_R * 2;
        if (inWater(wx, wz)) continue;                // hero grass stays dry too
        dummy.position.set(wx - hx, terrainH(wx, wz), wz - hz);
        // gentle uniform lean (≤.2 rad), planted exactly on the terrain
        dummy.rotation.set((hash2(i, 11) - .5) * .2, hash2(i, 22) * 6.28, (hash2(i, 33) - .5) * .2);
        const gs = .8 + hash2(i, 44) * .35;
        dummy.scale.set(1, gs, 1);
        dummy.updateMatrix();
        ((placed % 2 ? heroB : heroA) as THREE.InstancedMesh).setMatrixAt(Math.floor(placed / 2), dummy.matrix);
        placed++;
      }
      // park unused tail instances far below ground
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.001); dummy.position.set(0, -50, 0);
      for (let j = Math.ceil(placed / 2); j < heroA.count; j++) { dummy.updateMatrix(); heroA.setMatrixAt(j, dummy.matrix); }
      for (let j = Math.floor(placed / 2); j < heroB.count; j++) { dummy.updateMatrix(); heroB.setMatrixAt(j, dummy.matrix); }
      heroA.instanceMatrix.needsUpdate = true;
      heroB.instanceMatrix.needsUpdate = true;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      keys[k] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    type AudioWin = Window & { __jeepAudio?: { ctx: AudioContext; osc: OscillatorNode; gain: GainNode } };
    const ensureAudio = () => {
      const w = window as AudioWin;
      if (!w.__jeepAudio) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = 55;
        gain.gain.value = 0; osc.connect(gain).connect(ctx.destination);
        osc.start();
        w.__jeepAudio = { ctx, osc, gain };
      }
      return w.__jeepAudio!;
    };

    const upV = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const nrm = new THREE.Vector3();
    const camTarget = new THREE.Vector3();

    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(.05, (now - lastT) / 1000);
      lastT = now;

      /* ---- drive (folio-2025 style vehicle model) ---- */
      const gasPressed = !!(keys['arrowup'] || keys['w']);
      const revPressed = !!(keys['arrowdown'] || keys['s']);
      const accelInput = (gasPressed ? 1 : 0) - (revPressed ? 1 : 0);
      const turn = (keys['arrowleft'] || keys['a'] ? 1 : 0) - (keys['arrowright'] || keys['d'] ? 1 : 0);
      steer += ((turn * 1) - steer) * Math.min(1, dt * 7);

      const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      const speed = vel.length();

      // forward ratio: is the velocity aligned with the hood?
      const forwardRatio = speed > .05 ? vel.clone().normalize().dot(dir) : 1;
      const goingForward = forwardRatio > .5;

      // engine force with overflow falloff — power tapers as you pass top speed
      const topSpeed = 27;
      const overflowSpeed = Math.max(0, speed - topSpeed);
      let engineForce = accelInput * 34 / (1 + overflowSpeed);

      // brake logic: idle creep-brake, reverse-brake when fighting motion
      let brake = 0;
      if (!gasPressed && !revPressed) brake = 1.2;                    // idle brake
      if (speed > .5 && ((accelInput > 0 && !goingForward) || (accelInput < 0 && goingForward))) {
        brake = 22;                                                   // strong reverse brake
        engineForce = 0;
      }
      if (keys[' ']) brake = 60;                                      // handbrake

      vel.multiplyScalar(Math.pow(.55, dt));                          // rolling resistance
      vel.addScaledVector(dir, engineForce * dt);
      if (brake > 0) {
        const bFactor = Math.max(0, 1 - (brake * dt) / Math.max(speed, .6));
        vel.multiplyScalar(bFactor);
      }
      if (vel.length() > topSpeed + 8) vel.setLength(topSpeed + 8);

      /* ---- REAL-CAR TURNING: bicycle model with lateral grip ----
         heading turns from front-axle steer angle & wheelbase;
         velocity gradually aligns to the hood (tire grip), so at speed
         the car carves an arc instead of translating sideways. */
      const wheelBase = 2.6;
      const speedFwd = Math.max(2.5, speed * forwardRatio);           // effective fwd speed for turn rate
      const turnRate = (speedFwd / wheelBase) * Math.tan(steer * .48); // ackermann-ish yaw rate
      heading += turnRate * dt;

      // lateral grip: decompose velocity into forward/lateral vs hood,
      // bleed off lateral component (grip), keep forward.
      const rightX = Math.cos(heading), rightZ = -Math.sin(heading);
      let vFwd = vel.x * dir.x + vel.z * dir.z;
      let vLat = vel.x * rightX + vel.z * rightZ;
      const grip = keys[' '] ? 1.8 : 6.5;                             // handbrake breaks traction
      vLat *= Math.pow(.002, dt / grip * 10);                         // decay lateral slip
      vFwd *= Math.pow(.55, dt);                                      // rolling resistance on fwd part
      vFwd += engineForce * dt;
      // recompose
      vel.set(dir.x * vFwd + rightX * vLat, 0, dir.z * vFwd + rightZ * vLat);
      pos.addScaledVector(vel, dt);

      /* ---- bounded world: soft wall at the ±MAP_HALF rectangle edge ---- */
      if (Math.abs(pos.x) > MAP_HALF) {
        const over = Math.abs(pos.x) - MAP_HALF;
        pos.x = Math.sign(pos.x) * MAP_HALF;
        if (Math.sign(vel.x) === Math.sign(pos.x)) vel.x *= -.3;   // soft bounce
        if (over > 2) vel.z *= .9;
      }
      if (Math.abs(pos.z) > MAP_HALF) {
        pos.z = Math.sign(pos.z) * MAP_HALF;
        if (Math.sign(vel.z) === Math.sign(pos.z)) vel.z *= -.3;
      }

      /* ---- stick to terrain, tilt with slope ---- */
      pos.y = terrainH(pos.x, pos.z);
      terrainNormalInto(nrm, pos.x, pos.z);

      // slope slows you down (uphill)
      const slopeDot = dir.dot(new THREE.Vector3(nrm.x, 0, nrm.z).normalize());
      vel.addScaledVector(dir, -slopeDot * 6 * dt);

      // model hood points +Z; align it exactly with travel dir (sin h, 0, cos h)
      jeep.position.copy(pos).addScaledVector(nrm, .05);
      q.setFromUnitVectors(upV, nrm);
      jeep.quaternion.copy(q);
      jeep.rotateY(heading);

      // wheels (folio-style): container Y = steer, mesh X = roll.
      // Spin sign follows whether we're driving forward or backward.
      const spin = (speed * dt * 2.2) * (goingForward ? 1 : -1);
      for (const w of wheels) { w.rotation.x += spin; }
      wheelContainers[0].rotation.y = steer * .5;
      wheelContainers[1].rotation.y = steer * .5;

      // contact shadow follows jeep on terrain
      blob.position.set(pos.x, pos.y + .04, pos.z);
      blob.rotation.set(-Math.PI / 2, 0, -heading);

      /* ---- collisions (only nearby chunk obstacles) ---- */
      const pcx = Math.round(pos.x / CHUNK), pcz = Math.round(pos.z / CHUNK);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const c = chunks.get(`${pcx + dx},${pcz + dz}`);
          if (!c) continue;
          for (const o of c.obstacles) {
            const ddx = pos.x - o.x, ddz = pos.z - o.z;
            const rr = o.r + 1.35;
            const d2 = ddx * ddx + ddz * ddz;
            if (d2 < rr * rr) {
              const d = Math.sqrt(d2) || .001;
              const nx = ddx / d, nz = ddz / d;
              pos.x = o.x + nx * rr; pos.z = o.z + nz * rr;
              vel.reflect(new THREE.Vector3(nx, 0, nz)).multiplyScalar(.3);
            }
          }
        }
      }

      /* ---- pickups ---- */
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.mesh.rotation.y += dt * 3;
        p.mesh.position.y += Math.sin(now / 280 + i) * dt * .4;
        const d2p = p.mesh.position.distanceToSquared(jeep.position);
        if (d2p < 3.2 * 3.2) {
          if (p.kind === 'fuel') { hudRef.current.score += 25; showToast('⛽ FUEL +25'); }
          else if (p.kind === 'coin') { hudRef.current.score += 5; }
          else { hudRef.current.score += 60; showToast('📦 CRATE +60'); }
          scene.remove(p.mesh);
          pickups.splice(i, 1);
        }
      }

      /* ---- rollers ---- */
      if (Math.random() < dt * .3 && rollers.length < 5) {
        const bIdx = biomeAt(pos.x, pos.z);
        const ang = Math.random() * Math.PI * 2;
        const dist = 70 + Math.random() * 40;
        const ball = new THREE.Mesh(
          new THREE.IcosahedronGeometry(.95, 1),
          bIdx === 0 ? M.rollerSnow : M.rollerSand
        );
        ball.castShadow = true;
        ball.position.set(pos.x + Math.sin(ang) * dist, 0, pos.z + Math.cos(ang) * dist);
        ball.position.y = terrainH(ball.position.x, ball.position.z) + .95;
        const toward = new THREE.Vector3(pos.x - ball.position.x, 0, pos.z - ball.position.z).normalize()
          .applyAxisAngle(upV, (Math.random() - .5) * 1.2)
          .multiplyScalar(6 + Math.random() * 5);
        scene.add(ball);
        rollers.push({ mesh: ball, vx: toward.x, vz: toward.z });
      }
      for (let i = rollers.length - 1; i >= 0; i--) {
        const r = rollers[i];
        r.mesh.position.x += r.vx * dt;
        r.mesh.position.z += r.vz * dt;
        r.mesh.position.y = terrainH(r.mesh.position.x, r.mesh.position.z) + .95;
        r.mesh.rotation.z -= (r.vx + r.vz) * dt * 1.4;
        const dxr = pos.x - r.mesh.position.x, dzr = pos.z - r.mesh.position.z;
        if (dxr * dxr + dzr * dzr < 2.2 * 2.2) {
          vel.x += r.vx * .9; vel.z += r.vz * .9;
          hudRef.current.score = Math.max(0, hudRef.current.score - 10);
          showToast('💥 OOF -10');
          scene.remove(r.mesh); rollers.splice(i, 1); continue;
        }
        if (r.mesh.position.distanceTo(pos) > 110) { scene.remove(r.mesh); rollers.splice(i, 1); }
      }

      /* ---- stream chunks in ALL directions ---- */
      ensureChunksAround(pcx, pcz);

      /* ---- wind clock + hero grass follows the jeep on a 4m snap grid ---- */
      windUniforms.uTime.value = now / 1000;
      {
        const hx = Math.round(pos.x / 4) * 4, hz = Math.round(pos.z / 4) * 4;
        if (hx !== heroSnapX || hz !== heroSnapZ) {
          heroSnapX = hx; heroSnapZ = hz;
          heroGroup.position.set(hx, 0, hz);
          scatterHero(hx, hz);
        }
      }

      /* ---- butterflies: spawn near jeep in meadows, animate within 60m ---- */
      {
        if (butterflies.length < 8 && Math.random() < dt * 2) {
          const ba = Math.random() * Math.PI * 2, bd = 15 + Math.random() * 30;
          const bx = pos.x + Math.sin(ba) * bd, bz = pos.z + Math.cos(ba) * bd;
          if (biomeAt(bx, bz) === 2 && !inWater(bx, bz)) spawnButterfly(bx, bz);
        }
        for (let i = butterflies.length - 1; i >= 0; i--) {
          const bf = butterflies[i];
          const d2b = bf.base.distanceToSquared(pos);
          if (d2b > 120 * 120) { scene.remove(bf.group); butterflies.splice(i, 1); continue; }
          if (d2b < 60 * 60) {   // only animate when close — cheap LOD
            const bt = now / 1000 + bf.phase;
            bf.group.position.set(
              bf.base.x + Math.sin(bt * .7) * 1.5,
              bf.base.y + .9 + Math.sin(bt * 1.3) * .5,
              bf.base.z + Math.cos(bt * .9) * 1.5);
            bf.group.rotation.y = bt * .4;
            const flap = Math.sin(bt * 20) * .6;
            bf.wings[0].rotation.y = flap;
            bf.wings[1].rotation.y = Math.PI - flap;
          }
        }
      }

      /* ---- day/night: folio-style preset keyframe lerp ---- */
      const totalDist = (hudRef.current.distAcc += speed * dt);
      const cycle = (totalDist % 1400) / 1400 * 4;             // 0..4 across presets
      const iA = Math.floor(cycle) % 4;
      const A = DAY_PRESETS[DAY_ORDER[iA]];
      const Bp = DAY_PRESETS[DAY_ORDER[(iA + 1) % 4]];
      const tK = smooth(cycle % 1);                            // smoothstep easing — no pops at boundaries
      sun.color.setHex(A.light).lerp(DAY_COL[Bp.light], tK);
      sun.intensity = A.lightI + (Bp.lightI - A.lightI) * tK;
      hemi.intensity = A.hemiI + (Bp.hemiI - A.hemiI) * tK;
      hemi.color.copy(DAY_COL[A.hemiSky]).lerp(DAY_COL[Bp.hemiSky], tK);
      ambient.intensity = A.ambient + (Bp.ambient - A.ambient) * tK;
      const dayFogTarget = DAY_COL[A.fogA].clone().lerp(DAY_COL[Bp.fogA], tK); // single continuous target for sky+fog
      const ang = cycle / 4 * Math.PI * 2;
      sun.position.set(Math.sin(ang) * 80, 25 + Math.sin(ang) * 55, pos.z - 35);
      sun.target.position.copy(pos);
      sun.target.updateMatrixWorld();

      /* ---- biome ambience lerp ---- */
      const wMap = (M.waterMat as any).userData.map as THREE.CanvasTexture;
      if (wMap) { wMap.offset.x = Math.sin(now / 2600) * .06; wMap.offset.y = now / 9000 % 1; }
      const bIdx = biomeAt(pos.x, pos.z);
      if (bIdx !== lastBiomeIdx) { lastBiomeIdx = bIdx; setBiomeName(BIOMES[bIdx].name); }
      const B = BIOMES[bIdx];
      // continuous: biome base tinted by the same tK-driven day fog — no discrete night branch
      const skyTarget = new THREE.Color(B.skyDay).lerp(dayFogTarget, .6);
      const fogTarget = new THREE.Color(B.fog).lerp(dayFogTarget, .5);
      (scene.background as THREE.Color).lerp(skyTarget, dt * 1.5);
      (scene.fog as THREE.Fog).color.lerp(fogTarget, dt * 1.5);

      /* ---- folio-style camera: fixed spherical rig, zooms out with speed ---- */
      const zoomRatio = Math.min(1, speed / topSpeed);                 // 0..1 by speed
      const radius = CAM.radiusMin + (CAM.radiusMax - CAM.radiusMin) * zoomRatio;
      camTarget.setFromSphericalCoords(radius, CAM.phi, CAM.theta).add(pos);
      const groundUnderCam = terrainH(camTarget.x, camTarget.z);
      if (camTarget.y < groundUnderCam + 3) camTarget.y = groundUnderCam + 3;
      camera.position.lerp(camTarget, Math.min(1, dt * 5));
      camera.lookAt(pos.x, pos.y + 1.2, pos.z);

      /* audio */
      const a = ensureAudio();
      a.osc.frequency.value = 42 + speed * 4.2;
      a.gain.gain.value = mutedRef.current ? 0 : Math.min(.05, speed * .0038);

      setSpeedKmh(Math.round(speed * 3.6));
      // live data for the React minimap (read on a 500ms interval)
      hudRef.current.px = pos.x;
      hudRef.current.pz = pos.z;
      hudRef.current.heading = heading;
      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      const a = (window as AudioWin).__jeepAudio;
      if (a) a.gain.gain.value = 0;
      for (const [, c] of chunks) {
        c.group.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry?.dispose?.(); });
        scene.remove(c.group);
      }
      chunks.clear();
      for (const bf of butterflies) scene.remove(bf.group);
      butterflies.length = 0;
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const s = hudRef.current.score;
      setScore(s);
      setBestScore(prev => {
        if (s <= prev) return prev;
        try { localStorage.setItem('jeepdrift-best', String(s)); } catch { /* ignore */ }
        return s;
      });
    }, 250);
    return () => clearInterval(id);
  }, [started]);

  /* live biome minimap — redraw ~2x/sec */
  const miniRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!started) return;
    const draw = () => {
      const cv = miniRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      renderMinimap(ctx, hudRef.current.px, hudRef.current.pz, hudRef.current.heading);
    };
    draw();
    const id = setInterval(draw, 500);
    return () => clearInterval(id);
  }, [started]);

  return (
    <div className="g-root">
      <div ref={mountRef} className="g-mount" />

      <div className="g-vignette" aria-hidden="true" />

      <div className="g-hud">
        <div className="g-hud-left">
          <div className="g-hud-score g-glass">
            <span className="g-hud-label">Score</span>
            <span className="g-hud-value">{score.toLocaleString()}</span>
          </div>
          <div className="g-hud-best g-glass">
            <span className="g-hud-label">Best</span>
            <span className="g-hud-best-num">{bestScore.toLocaleString()}</span>
          </div>
        </div>

        <div className="g-hud-right">
          <div className="g-hud-speedo g-glass">
            <svg viewBox="0 0 100 60" className="g-speedo-svg" aria-hidden="true">
              <path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" strokeLinecap="round"/>
              <path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke="#4da3ff" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${Math.min(1, speedKmh/120) * 126} 999`}/>
            </svg>
            <div className="g-speedo-num">{speedKmh}<small>km/h</small></div>
          </div>
          <div className="g-hud-actions">
            <button className="g-hud-btn g-glass" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
            <a className="g-hud-btn g-glass" href="#/" aria-label="Exit game">✕</a>
          </div>
        </div>
      </div>

      {toast && <div className="g-toast">{toast}</div>}

      {started && (
        <div
          className="g-minimap"
          style={{
            position: 'absolute', right: 16, bottom: 16, width: 160, height: 160,
            borderRadius: '50%', padding: 4, boxSizing: 'border-box',
            background: 'rgba(15,20,30,.35)', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.22)',
            boxShadow: '0 6px 24px rgba(0,0,0,.35)',
            zIndex: 5,
          }}
        >
          <canvas ref={miniRef} width={160} height={160}
            style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
          <span style={{
            position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.85)',
            textShadow: '0 1px 3px rgba(0,0,0,.6)', pointerEvents: 'none',
          }}>N</span>
        </div>
      )}

      {!started && (
        <div className="g-overlay">
          <h1 className="g-title">JEEP<span className="g-title-accent">DRIFT</span></h1>
          <p className="g-sub">
            Infinite open world. Drive any direction. Collect fuel, coins and crates.
            Hit something? Reverse and send it.
          </p>
          <div className="g-keys">
            <span>▲ ◀ ▼ ▶ / WASD drive</span>
            <span>SPACE handbrake</span>
          </div>
          <button className="g-start" onClick={() => setStarted(true)}>
            START<span className="g-start-accent">ENGINE</span>
          </button>
          <button className="g-exit" onClick={() => { window.location.hash = '#/'; }}>✕ Exit</button>
        </div>
      )}
    </div>
  );
};

export default GameApp;
