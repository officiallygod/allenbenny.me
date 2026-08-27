import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './Game.css';

/* ================================================================
   /game — "JEEP DRIFT" v3 — GTAV-grade graphics edition.
   Integration layer only: all rendering lives in ./gfx/* modules
   (terrain+roads, materials, sky/lighting, postfx, camera, jeep,
   props, chunks). Physics (bicycle model + lateral grip) unchanged.
   ================================================================ */

import {
  CHUNK, VIEW_CHUNKS, WORLD_HALF, IS_MOBILE, hash2,
} from './gfx/noise';
import {
  terrainH, terrainNormalInto, biomeAt, roadDist, onRoad,
  ROAD_HALF_WIDTH, BIOME_NAMES, BIOME_TINTS,
  ISLAND_HALF, BEACH, ROAD_END,
} from './gfx/terrain';
import { buildMaterials, updateTimeUniforms, type MaterialLibrary } from './gfx/materials';
import {
  buildSky, buildLighting, buildEnvironment,
  DAY_PRESETS, type SkyDome, type LightingRig,
} from './gfx/sky';
import { buildPostFX } from './gfx/postfx';
import { buildChaseCam } from './gfx/camera';
import { buildJeep } from './gfx/jeep';
import { buildChunk, buildClumpGeo } from './gfx/chunks';
import { loadFerrari, type Ferrari } from './gfx/ferrari';
import type { BuiltChunk, ChunkBuildContext, ChaseCam, Jeep } from './gfx/types';

interface Pickup { mesh: THREE.Object3D; kind: 'fuel' | 'coin' | 'crate'; }
interface Roller { mesh: THREE.Mesh; vx: number; vz: number; }
interface Butterfly { group: THREE.Group; wings: THREE.Mesh[]; base: THREE.Vector3; phase: number; }

const MAP_HALF = WORLD_HALF;

/* every lake ever created (bounded map ⇒ finite); keeps spawns dry */
const lakeRects: { x: number; z: number; r: number }[] = [];
function lakeAt(x: number, z: number): boolean {
  return lakeRects.some(l => Math.hypot(x - l.x, z - l.z) < l.r + 2);
}

/* day-scalar per preset name (for sky dome + headlights) */
const PRESET_DAYF: Record<string, number> = { day: 1, dusk: .45, night: .06, dawn: .35 };

function smooth(t: number) { return t * t * (3 - 2 * t); }

/* curved grass blade — rows bend toward +z so blades arc naturally */
function makeBladeGeo(): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(.14, .7, 1, 3);
  g.translate(0, .35, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getY(i) * .15);
  g.computeVertexNormals();
  return g;
}

/* ---------------- minimap — GTA-style rotating RECTANGLE ----------------
   Monochrome nav map: a dark land plate floating in open water, basic
   roads, world rotating under a fixed player arrow (drive direction is
   always screen-up). Outside the island: nothing but water. */
export function renderMinimap(ctx: CanvasRenderingContext2D, px: number, pz: number, heading: number) {
  const W = 208, H = 148, CX = W / 2, CY = H / 2;
  const RANGE = 5;
  const SPACING = 60;
  const PAD = 9;
  const sc = Math.min(W / 2 - PAD, H / 2 - PAD) / (RANGE * SPACING);
  ctx.clearRect(0, 0, W, H);

  /* open water everywhere — matches the in-world ocean tint */
  ctx.fillStyle = '#123a52';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  /* world-metres → car-space rotation (det > 0, never mirrored):
     drive direction lands straight up */
  const al = heading - Math.PI;
  ctx.translate(CX, CY);
  ctx.transform(sc * Math.cos(al), sc * Math.sin(al), -sc * Math.sin(al), sc * Math.cos(al), 0, 0);

  /* land plate — the square island itself */
  ctx.fillStyle = '#2b3440';
  ctx.fillRect(-ISLAND_HALF, -ISLAND_HALF, ISLAND_HALF * 2, ISLAND_HALF * 2);

  /* faint survey grid */
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1 / sc;
  ctx.beginPath();
  for (let g = -ISLAND_HALF + SPACING; g < ISLAND_HALF; g += SPACING) {
    ctx.moveTo(g, -ISLAND_HALF); ctx.lineTo(g, ISLAND_HALF);
    ctx.moveTo(-ISLAND_HALF, g); ctx.lineTo(ISLAND_HALF, g);
  }
  ctx.stroke();

  /* lakes/rivers — same hash recipe as the chunk builder ⇒ exact positions */
  ctx.fillStyle = '#1b5e8f';
  const cMinL = Math.floor((-ISLAND_HALF - CHUNK) / CHUNK);
  const cMaxL = Math.floor((ISLAND_HALF + CHUNK) / CHUNK);
  for (let lcx = cMinL; lcx <= cMaxL; lcx++) {
    for (let lcz = cMinL; lcz <= cMaxL; lcz++) {
      const lakeSeed = hash2(lcx * 17.31, lcz * 43.17);
      if (lakeSeed >= .3) continue;
      const lox = lcx * CHUNK, loz = lcz * CHUNK;
      const lx = lox + ((lakeSeed * 977) % 1 - .5) * CHUNK * .5;
      const lz = loz + (hash2(lcx, lcz * 91.7) - .5) * CHUNK * .5;
      const lr = 10 + hash2(lcx * 3.3, lcz * 7.1) * 14;
      if (roadDist(lx, lz) < lr + 10) continue;      // skipped in-world too
      ctx.beginPath();
      ctx.arc(lx - px, lz - pz, lr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* roads — basic flat strokes, two weights (clipped to the island) */
  ctx.save();
  ctx.beginPath();
  ctx.rect(-ISLAND_HALF - 2, -ISLAND_HALF - 2, (ISLAND_HALF + 2) * 2, (ISLAND_HALF + 2) * 2);
  ctx.clip();
  const strokePath = (draw: () => void, w: number, col: string) => {
    ctx.lineWidth = w; ctx.strokeStyle = col;
    ctx.beginPath(); draw(); ctx.stroke();
  };
  /* highways stop short of the shore, ending in U-turn bulbs */
  const RE = ROAD_END, BW = ROAD_HALF_WIDTH;
  const highways = () => {
    ctx.moveTo(0 - px, -RE - pz); ctx.lineTo(0 - px, RE - pz);
    ctx.moveTo(-RE - px, 0 - pz); ctx.lineTo(RE - px, 0 - pz);
    for (const sx of [-1, 1]) {
      for (const [bx, bz] of [[0, sx * RE], [sx * RE, 0]]) {
        ctx.moveTo(bx + BW * 2.2 - px, bz - pz);
        ctx.arc(bx - px, bz - pz, BW * 2.2, 0, Math.PI * 2);
      }
    }
  };
  const ring = () => {
    for (let a = 0; a <= 64; a++) {
      const th = a / 64 * Math.PI * 2;
      const rr = 260 + Math.sin(th * 5) * 8;
      const sx = Math.cos(th) * rr - px, sy = Math.sin(th) * rr - pz;
      a === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
  };
  const diagA = () => {
    for (let x = -MAP_HALF; x <= MAP_HALF; x += 20) {
      const sx = x - px, sy = 140 * Math.sin(x * .008) + 60 - pz;
      x === -MAP_HALF ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
  };
  const diagB = () => {
    for (let z = -MAP_HALF; z <= MAP_HALF; z += 20) {
      const sx = -120 * Math.sin(z * .007) - 70 - px, sy = z - pz;
      z === -MAP_HALF ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
  };
  /* highways: dark casing + pale fill (crisp GTA look, still basic) */
  strokePath(highways, 7, '#151a21');
  strokePath(highways, 4, '#c3ccd6');
  /* minor roads */
  ctx.restore();                       // island clip only guards the highways
  strokePath(ring, 3, '#97a1ac');
  strokePath(diagA, 3, '#97a1ac');
  strokePath(diagB, 3, '#97a1ac');

  /* coastline where land meets water */
  ctx.strokeStyle = 'rgba(168,199,224,.55)';
  ctx.lineWidth = 2.5 / sc;
  ctx.strokeRect(-ISLAND_HALF, -ISLAND_HALF, ISLAND_HALF * 2, ISLAND_HALF * 2);
  /* drivable-area limit (soft wall sits here) */
  const DL = ISLAND_HALF + 14;
  ctx.setLineDash([7 / sc, 6 / sc]);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.5 / sc;
  ctx.strokeRect(-DL, -DL, DL * 2, DL * 2);
  ctx.setLineDash([]);
  ctx.restore();

  /* panel frame */
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(.75, .75, W - 1.5, H - 1.5);

  /* compass chip — needle always points toward world north */
  const ccx = W - 21, ccy = 21, cr = 11;
  ctx.beginPath();
  ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,14,20,.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.translate(ccx, ccy);
  ctx.rotate(heading + Math.PI);   // needle rotation: north at screen-bottom when heading 0
  ctx.fillStyle = '#e8eef6';
  ctx.beginPath();
  ctx.moveTo(0, -cr + 3); ctx.lineTo(3.2, 2); ctx.lineTo(-3.2, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.38)';
  ctx.beginPath();
  ctx.moveTo(0, cr - 3); ctx.lineTo(2, 2); ctx.lineTo(-2, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '700 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', ccx, ccy + cr + 9);

  /* player arrow — pinned dead centre, ALWAYS pointing up */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(15,19,28,.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(CX, CY - 8.5);
  ctx.lineTo(CX + 6, CY + 6.5);
  ctx.lineTo(CX, CY + 3);
  ctx.lineTo(CX - 6, CY + 6.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const GameApp: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef({ score: 0, distAcc: 0, px: 0, pz: 0, heading: 0, fps: 0 });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return Number(localStorage.getItem('jeepdrift-best')) || 0; } catch { return 0; }
  });
  const [speedKmh, setSpeedKmh] = useState(0);
  const [rpm01, setRpm01] = useState(0);
  const [gear, setGear] = useState<number | string>(1);
  const [camMode, setCamMode] = useState('chase');
  const [biomeName, setBiomeName] = useState(BIOME_NAMES[2]);
  const [fps, setFps] = useState(0);
  const [showFps, setShowFps] = useState(false);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(() =>
    /autostart/.test(window.location.search) || /autostart/.test(window.location.hash));
  const [toast, setToast] = useState('');
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const chaseRef = useRef<ChaseCam | null>(null);
  const engineCleanupRef = useRef<(() => void) | null>(null);
  const [vehStatus, setVehStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [vehErr, setVehErr] = useState('');
  const cycleCam = useCallback(() => {
    const c = chaseRef.current;
    if (c) setCamMode(c.cycleMode());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1500);
  }, []);

  /* ================= ENGINE ================= */
  useEffect(() => {
    if (!started || !mountRef.current) return;
    const mount = mountRef.current;
    try {
      const cleanup = engineInit(mount);
      engineCleanupRef.current = cleanup;
    } catch (e) {
      console.error('engine init failed', e);
    }
    return () => { engineCleanupRef.current?.(); engineCleanupRef.current = null; };
  }, [started]);

  function engineInit(mount: HTMLDivElement): () => void {

    const renderer = new THREE.WebGLRenderer({
      antialias: false,                    // MSAA happens inside the composer target
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BIOME_TINTS[2].skyDay);
    scene.fog = new THREE.Fog(BIOME_TINTS[2].fog, 60, 480);

    /* ---- gfx modules ---- */
    const mats: MaterialLibrary = buildMaterials(renderer);
    const chase: ChaseCam = buildChaseCam(mount.clientWidth / mount.clientHeight);
    chaseRef.current = chase;
    const camera = chase.camera;
    const sky: SkyDome = buildSky(scene);
    const light: LightingRig = buildLighting(scene, IS_MOBILE ? 1024 : 4096);
    const envTex = buildEnvironment(renderer, scene);
    const postfx = buildPostFX(renderer, scene, camera);
    /* Some Windows/ANGLE GPUs present the composer chain black; verify once
       and fall back to direct rendering if this machine is one of them. */
    let useComposer = postfx.selfTest();
    /* ---- vehicle: procedural jeep instantly, Ferrari swaps in when loaded ----
       Adapter hides the differences (steer axis, suspension support). */
    interface Veh {
      group: THREE.Group;
      spin(delta: number): void;
      steer(v: number): void;
      brakeMat: THREE.MeshStandardMaterial;
      beams(dark01: number): void;
      susp(a: number[]): void;
    }
    const jeep: Jeep = buildJeep(mats);
    scene.add(jeep.group);
    let veh: Veh = {
      group: jeep.group,
      spin(d) { for (const w of jeep.wheels) w.rotation.x += d; },
      steer(v) { jeep.wheelContainers[0].rotation.y = v; jeep.wheelContainers[1].rotation.y = v; },
      brakeMat: jeep.brakeLights,
      beams(dark) { jeep.headBeam.intensity = 8 + dark * 85; },
      susp(a) { jeep.setSuspension(a[0], a[1], a[2], a[3]); },
    };
    let ferrari: Ferrari | null = null;
    const runningRef = { current: true };   // declared before the async swap uses it
    loadFerrari(mats)
      .then(f => {
        if (!runningRef.current) { return; }
        scene.remove(jeep.group);
        scene.add(f.group);
        ferrari = f;
        setVehStatus('ready');
        veh = {
          group: f.group,
          spin(d) { for (const r of f.rollers) r.rotation.x -= d; },   // demo convention
          /* ONLY front wheels pivot when steering — rears stay fixed.
             The glTF wheel roots' steer axis is Z (demo convention). */
          steer(v) {
            if (f.steerRoots[0]) f.steerRoots[0].rotation.z = v;
            if (f.steerRoots[1]) f.steerRoots[1].rotation.z = v;
          },
          brakeMat: f.brakeMat,
          beams(dark) { for (const b of f.beams) b.intensity = 4 + dark * 42; },
          susp() { /* glTF model has no separate spring nodes */ },
        };
      })
      .catch(err => {
        setVehStatus('failed');
        let msg: string;
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'object' && err) {
          const anyErr = err as Record<string, unknown>;
          const tgt = anyErr.target as { responseText?: string; status?: number } | undefined;
          msg = tgt && tgt.status !== undefined
            ? `fetch ${tgt.status}`
            : Object.entries(anyErr).slice(0, 4).map(([k, v]) => `${k}=${String(v).slice(0, 30)}`).join(',');
        } else msg = String(err);
        setVehErr(msg.slice(0, 80));
        console.warn('Ferrari unavailable, keeping jeep', err);
      });

    /* soft contact shadow under the jeep (always readable) */
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .26, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    scene.add(blob);

    /* ---------- global ocean: square island floats in open sea ---------- */
    const oceanY = -1.6;
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry((MAP_HALF + 900) * 2, (MAP_HALF + 900) * 2),
      mats.water,
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = oceanY;
    scene.add(ocean);

    /* ---------- chunk streaming ---------- */
    const chunks = new Map<string, BuiltChunk>();
    const pickups: Pickup[] = [];
    const dummy = new THREE.Object3D();
    const ctx: ChunkBuildContext = { mats, pickups, lakeRects, dummy };

    function disposeChunkGroup(group: THREE.Group) {
      group.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry && !(m.geometry.userData as { shared?: boolean }).shared) {
          m.geometry.dispose();
        }
      });
      scene.remove(group);
    }
    function ensureChunksAround(pcx: number, pcz: number) {
      const cMin = -Math.ceil(MAP_HALF / CHUNK), cMax = Math.ceil(MAP_HALF / CHUNK);
      for (let dx = -VIEW_CHUNKS; dx <= VIEW_CHUNKS; dx++) {
        for (let dz = -VIEW_CHUNKS; dz <= VIEW_CHUNKS; dz++) {
          const bx = Math.min(cMax, Math.max(cMin, pcx + dx));
          const bz = Math.min(cMax, Math.max(cMin, pcz + dz));
          /* island gate: never build terrain chunks for open sea */
          if (Math.abs(bx * CHUNK) > ISLAND_HALF + BEACH + CHUNK &&
              Math.abs(bz * CHUNK) > ISLAND_HALF + BEACH + CHUNK) continue;
          const k = `${bx},${bz}`;
          if (!chunks.has(k)) {
            const built = buildChunk(bx, bz, ctx);
            chunks.set(k, built);
            scene.add(built.group);
            for (const l of built.lakes) lakeRects.push(l);
          }
        }
      }
      for (const [k, c] of chunks) {
        if (Math.abs(c.cx - pcx) > VIEW_CHUNKS + 1 || Math.abs(c.cz - pcz) > VIEW_CHUNKS + 1) {
          for (const l of c.lakes) {
            const idx = lakeRects.indexOf(l);
            if (idx !== -1) lakeRects.splice(idx, 1);
          }
          disposeChunkGroup(c.group);
          chunks.delete(k);
        }
      }
    }

    /* ---------- butterflies (ambient life, meadow) ---------- */
    const butterflies: Butterfly[] = [];
    function spawnButterfly(x: number, z: number): void {
      const g = new THREE.Group();
      const wingGeo = new THREE.PlaneGeometry(.24, .17);
      wingGeo.translate(.12, 0, 0);
      const wMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
      const wl = new THREE.Mesh(wingGeo, wMat);
      const wr = new THREE.Mesh(wingGeo, wMat); wr.rotation.y = Math.PI;
      g.add(wl, wr);
      g.position.set(x, terrainH(x, z) + 1, z);
      scene.add(g);
      butterflies.push({ group: g, wings: [wl, wr], base: new THREE.Vector3(x, terrainH(x, z), z), phase: Math.random() * 20 });
    }

    /* ---------- hero grass: dense patch following the player ---------- */
    const HERO_N = IS_MOBILE ? 700 : 1600;   // clumps in the 30m ring around the car
    const heroGeo = buildClumpGeo();
    const heroA = new THREE.InstancedMesh(heroGeo, mats.grassBladeA, Math.ceil(HERO_N / 2));
    const heroB = new THREE.InstancedMesh(heroGeo, mats.grassBladeB, HERO_N - Math.ceil(HERO_N / 2));
    heroA.frustumCulled = false;
    heroB.frustumCulled = false;
    const heroGroup = new THREE.Group();
    heroGroup.add(heroA, heroB);
    scene.add(heroGroup);
    let heroSnapX = 1e9, heroSnapZ = 1e9;
    function scatterHero(hx: number, hz: number) {
      let placed = 0;
      const R = 15;
      for (let i = 0; i < HERO_N * 3 && placed < HERO_N; i++) {
        const wx = hx + (hash2(i * 1.7 + hx * .37, hz * 3.1) - .5) * R * 2;
        const wz = hz + (hash2(hz * 5.3 + i, hx * 7.7) - .5) * R * 2;
        if (lakeAt(wx, wz) || onRoad(wx, wz)) continue;
        const b = biomeAt(wx, wz);
        if (!(b === 2 || b === 0)) continue;
        terrainNormalInto(nrm, wx, wz, .8);
        dummy.position.set(wx - hx, terrainH(wx, wz), wz - hz);
        q.setFromUnitVectors(upV, nrm);
        dummy.quaternion.copy(q);
        dummy.rotateY(hash2(i, 71) * Math.PI * 2);
        dummy.scale.setScalar(.8 + hash2(i, 44) * .5);
        dummy.updateMatrix();
        ((placed % 2 ? heroB : heroA) as THREE.InstancedMesh).setMatrixAt(Math.floor(placed / 2), dummy.matrix);
        placed++;
      }
      dummy.quaternion.identity(); dummy.scale.setScalar(.001); dummy.position.set(0, -50, 0);
      for (let j = Math.ceil(placed / 2); j < heroA.count; j++) { dummy.updateMatrix(); heroA.setMatrixAt(j, dummy.matrix); }
      for (let j = Math.floor(placed / 2); j < heroB.count; j++) { dummy.updateMatrix(); heroB.setMatrixAt(j, dummy.matrix); }
      heroA.instanceMatrix.needsUpdate = true;
      heroB.instanceMatrix.needsUpdate = true;
    }

    /* ---------- input ---------- */
    const keys: Record<string, boolean> = {};
    /* on-screen pedals: pointerdown = press, pointerup/leave = release.
       Works without keyboard focus (preview panes, touch). */
    const pedalState = { gas: false, brake: false };
    let autoDrive = /autodrive/.test(window.location.hash);
    const wirePedal = (id: string, key: 'w' | 's') => {
      const el = document.getElementById(id);
      if (!el) return;
      const dn = (e: Event) => { e.preventDefault(); pedalState[key === 'w' ? 'gas' : 'brake'] = true; keys[key] = true; el.classList.add('g-pedal-on'); };
      const up = () => { pedalState[key === 'w' ? 'gas' : 'brake'] = false; keys[key] = false; el.classList.remove('g-pedal-on'); };
      el.addEventListener('pointerdown', dn);
      window.addEventListener('pointerup', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('pointercancel', up);
    };
    let dragging = false;
    let lastPX = 0, lastPY = 0;
    const onDragStart = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging = true; lastPX = e.clientX; lastPY = e.clientY;
    };
    const onDragMove = (e: MouseEvent) => {
      if (!dragging) return;
      chase.orbit(e.clientX - lastPX, e.clientY - lastPY);
      lastPX = e.clientX; lastPY = e.clientY;
    };
    const onDragEnd = () => { dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      chase.zoom(Math.sign(e.deltaY) * 60);
    };
    mount.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    mount.addEventListener('wheel', onWheel, { passive: false });

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      keys[k] = true;
      if (k === 'f') setShowFps(s => !s);
      if (k === 'c') setCamMode(chase.cycleMode());
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      chase.resize(w / h);
      renderer.setSize(w, h);
      postfx.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    /* the mount can be 0-sized at init (pane layout, hidden tab, autostart
       before CSS lands) — observe it and resize the moment it gains size */
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    type AudioWin = Window & { __jeepAudio?: { ctx: AudioContext; osc: OscillatorNode; gain: GainNode } };
    const ensureAudio = () => {
      const w = window as AudioWin;
      if (!w.__jeepAudio) {
        const actx = new AudioContext();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = 55;
        gain.gain.value = 0; osc.connect(gain).connect(actx.destination);
        osc.start();
        w.__jeepAudio = { ctx: actx, osc, gain };
      }
      return w.__jeepAudio!;
    };

    /* ---------- state ---------- */
    /* spawn ON the north-bound highway, just south of the crossroads */
    const pos = new THREE.Vector3(0, terrainH(0, -24), -24);
    const vel = new THREE.Vector3();
    let heading = 0;
    let steer = 0;
    let lastT = performance.now();
    let running = true;
    let raf = 0;
    let lastBiomeIdx = -1;
    let frames = 0, fpsClock = lastT;
    let pruneClock = 0;

    /* suspension smoothing buffers */
    const susp = [0, 0, 0, 0];
    let bodyRoll = 0, bodyPitch = 0, prevVFwd = 0;
    let brakeGlow = 0;
    /* CarControls port state */
    const vFwdState = { current: 0 };     // signed forward speed (m/s)
    let wheelOri = 0;                     // virtual steering wheel angle
    const TURNING_RADIUS = 6;             // reference default
    let hudClock = 0;
    const dayFactorRef = { current: 1 };  // beams ramp from this

    /* scratch — zero allocations in tick */
    const upV = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const nrm = new THREE.Vector3();
    const tmpV = new THREE.Vector3();
    const dirV = new THREE.Vector3();
    const sunDirV = new THREE.Vector3();
    const colA = new THREE.Color();
    const colB = new THREE.Color();
    const colC = new THREE.Color();

    ensureChunksAround(Math.round(pos.x / CHUNK), Math.round(pos.z / CHUNK));
    wirePedal('g-pedal-gas', 'w');
    wirePedal('g-pedal-brake', 's');
    if (autoDrive) keys['w'] = true;   // #autodrive: drive forward for self-test

    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(.05, (now - lastT) / 1000);
      lastT = now;
      frames++;
      if (now - fpsClock > 500) {
        hudRef.current.fps = Math.round(frames * 1000 / (now - fpsClock));
        frames = 0; fpsClock = now;
      }

      /* ================================================================
         DRIVE — ported from JS-3D-Car's CarControls (alteredq/looeee),
         demo constants: maxSpeed 180 km/h, accel 10 m/s², reverse −45,
         deceleration = accel·2, brakePower 10, demo runs delta/3 for
         the gentle feel. Steering: wheelOrientation auto-centers,
         car yaws by the arc formula speed·turningRadius.
         ================================================================ */
      const MAXSPEED = 78;            // m/s ≈ 280 km/h (Ferrari territory)
      const REVERSE_CAP = -12;        // ≈ −43 km/h
      const LAUNCH_ACCEL = 8.2;       // traction-limited launch (0–45 km/h)
      const POWER_ACCEL = 10.0;       // power curve peak, falls with speed
      const REV_ACCEL = 3.5;
      const DECEL = 20;
      const BRAKE_POWER = 10;
      const gasPressed = !!(keys['arrowup'] || keys['w']);
      const revPressed = !!(keys['arrowdown'] || keys['s']);
      const handbraking = !!keys[' '];

      /* water resistance once the bed dips under the ocean surface */
      const inWater = pos.y < oceanY - .12;

      /* realistic power delivery: grip-limited launch, then torque curve
         falloff — 0→100 km/h ≈ 4 s, 160 only after ~7 s of pulling */
      if (gasPressed) {
        const v = vFwdState.current;
        const powerScale = inWater ? .35 : 1;
        const accel = v < 12.5
          ? LAUNCH_ACCEL * powerScale
          : POWER_ACCEL * Math.max(.16, 1 - v / MAXSPEED) * powerScale;
        vFwdState.current = Math.min(v + dt * accel, MAXSPEED);
      } else if (revPressed) {
        vFwdState.current = Math.max(vFwdState.current - dt * REV_ACCEL, REVERSE_CAP);
      } else {
        const k = 1 - Math.pow(2, -10 * Math.abs(vFwdState.current) / MAXSPEED);
        const dec = k * dt * DECEL * (handbraking ? BRAKE_POWER : 1);
        vFwdState.current -= Math.sign(vFwdState.current) * Math.min(Math.abs(vFwdState.current), dec);
      }
      /* sloshing drag in water — you wade, not race */
      if (inWater) {
        const drag = vFwdState.current * Math.min(1, dt * 2.2);
        vFwdState.current -= drag;
      }
      /* slope adds real weight: uphill bleeds speed, downhill pushes */
      const dir = dirV.set(Math.sin(heading), 0, Math.cos(heading));
      pos.y = terrainH(pos.x, pos.z);
      terrainNormalInto(nrm, pos.x, pos.z);
      const slopeDot = dir.dot(tmpV.set(nrm.x, 0, nrm.z).normalize());
      vFwdState.current -= slopeDot * 9 * dt;

      /* steering: input ramps a virtual wheel that auto-centers */
      const turnIn = (keys['arrowleft'] || keys['a'] ? 1 : 0) - (keys['arrowright'] || keys['d'] ? 1 : 0);
      const STEER_RATE = 1.5, MAX_STEER = .6;
      if (turnIn !== 0) {
        wheelOri += THREE.MathUtils.clamp(turnIn * STEER_RATE * dt - wheelOri, -STEER_RATE * dt, STEER_RATE * dt);
        wheelOri = THREE.MathUtils.clamp(wheelOri, -MAX_STEER, MAX_STEER);
      } else {
        wheelOri -= Math.sign(wheelOri) * Math.min(Math.abs(wheelOri), STEER_RATE * dt);
      }
      /* yaw via the reference arc formula, softened with speed so it
         feels planted at pace and nimble in town */
      const spd01 = Math.min(1, Math.abs(vFwdState.current) / MAXSPEED);
      const radiusK = .02 * TURNING_RADIUS * (1 + spd01 * 2.2);   // 6 → ~19.2
      heading -= vFwdState.current * dt * radiusK * wheelOri;

      vel.set(dir.x * vFwdState.current, 0, dir.z * vFwdState.current);
      pos.addScaledVector(vel, dt);

      const speed = Math.abs(vFwdState.current);
      const goingForward = vFwdState.current > 0;
      const brakeOn = handbraking || (!gasPressed && !revPressed && Math.abs(vFwdState.current) > 4);
      /* exact 7-speed gearbox: gear = band containing |v|, RPM = exact
         position inside that band (idle floor .16 → redline 1.0).
         The HUD therefore shows the TRUE drivetrain state, always. */
      const GEAR_TOPS = [13, 24, 36, 49, 62, 74, 78];
      let gearIdx = 0;
      while (gearIdx < GEAR_TOPS.length - 1 && speed > GEAR_TOPS[gearIdx]) gearIdx++;
      const gLo = gearIdx === 0 ? 0 : GEAR_TOPS[gearIdx - 1];
      const rpm01 = Math.max(.14, Math.min(1,
        .16 + .84 * (speed - gLo) / (GEAR_TOPS[gearIdx] - gLo)));

      /* island shelf: you may wade into the shallows and climb back out —
         hard stop only far out at the old map bound */
      const LIM = MAP_HALF;
      if (Math.abs(pos.x) > LIM) {
        pos.x = Math.sign(pos.x) * LIM;
        if (Math.sign(vel.x) === Math.sign(pos.x)) vel.x *= -.3;
      }
      if (Math.abs(pos.z) > LIM) {
        pos.z = Math.sign(pos.z) * LIM;
        if (Math.sign(vel.z) === Math.sign(pos.z)) vel.z *= -.3;
      }

      /* stick to terrain, tilt with slope (heights already sampled above) */
      veh.group.position.copy(pos).addScaledVector(nrm, .05);
      q.setFromUnitVectors(upV, nrm);
      veh.group.quaternion.copy(q);
      veh.group.rotateY(heading);

      /* body roll into corners + pitch under accel/brake (visual only) */
      const targetRoll = THREE.MathUtils.clamp(-wheelOri * Math.min(1, speed / 14) * .35, -.09, .09);
      const accel = (vFwdState.current - prevVFwd) / Math.max(dt, .001); prevVFwd = vFwdState.current;
      const targetPitch = THREE.MathUtils.clamp(-accel * .0045, -.05, .06);
      bodyRoll += (targetRoll - bodyRoll) * Math.min(1, dt * 6);
      bodyPitch += (targetPitch - bodyPitch) * Math.min(1, dt * 6);
      veh.group.rotateZ(bodyRoll);
      veh.group.rotateX(bodyPitch);

      /* suspension: sample ground under each wheel, offset containers */
      {
        const fx = Math.sin(heading), fz = Math.cos(heading);
        const rx = Math.cos(heading), rz = -Math.sin(heading);
        const wx = [fx * 1.28, fx * 1.28, -fx * 1.28, -fx * 1.28];
        const wz = [fz * 1.28, fz * 1.28, -fz * 1.28, -fz * 1.28];
        const sx = [rx * -1.08, rx * 1.08, rx * -1.08, rx * 1.08];
        const sz = [rz * -1.08, rz * 1.08, rz * -1.08, rz * 1.08];
        for (let i = 0; i < 4; i++) {
          const gy = terrainH(pos.x + wx[i] + sx[i], pos.z + wz[i] + sz[i]);
          /* gentle visual squat only — the chassis never sinks */
          const target = THREE.MathUtils.clamp((gy - pos.y) * .45, -.1, .1);
          susp[i] += (target - susp[i]) * Math.min(1, dt * 10);
        }
        veh.susp(susp);
      }

      /* wheels: steer front (model axis), roll all */
      const spin = speed * dt * 2.2 * (goingForward ? 1 : -1);
      veh.spin(spin);
      veh.steer(wheelOri);

      /* brake lights + headlight beams */
      const targetGlow = brakeOn ? 5 : 1.1;
      brakeGlow += (targetGlow - brakeGlow) * Math.min(1, dt * 12);
      veh.brakeMat.emissiveIntensity = brakeGlow;
      /* beams read dayFactor through a ref (tick runs before it's computed) */
      veh.beams(1 - dayFactorRef.current);

      /* contact shadow pinned to true terrain (jeep sits above it) */
      blob.position.set(pos.x, terrainH(pos.x, pos.z) + .04, pos.z);
      blob.rotation.set(-Math.PI / 2, 0, -heading);

      /* ---- collisions (nearby chunk obstacles) ---- */
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
        const d2p = p.mesh.position.distanceToSquared(jeep.group.position);
        if (d2p < 3.2 * 3.2) {
          if (p.kind === 'fuel') { hudRef.current.score += 25; showToast('⛽ FUEL +25'); }
          else if (p.kind === 'coin') { hudRef.current.score += 5; }
          else { hudRef.current.score += 60; showToast('📦 CRATE +60'); }
          p.mesh.parent?.remove(p.mesh);
          pickups.splice(i, 1);
        }
      }
      /* prune far/unparented pickups occasionally */
      pruneClock += dt;
      if (pruneClock > 2) {
        pruneClock = 0;
        for (let i = pickups.length - 1; i >= 0; i--) {
          const wp = pickups[i].mesh.getWorldPosition(tmpV);
          if (!pickups[i].mesh.parent || wp.distanceTo(jeep.group.position) > (VIEW_CHUNKS + 2) * CHUNK + 40) {
            pickups.splice(i, 1);
          }
        }
      }

      /* ---- rolling boulders/snowballs (ambience hazard) ---- */
      if (Math.random() < dt * .3 && rollersLen() < 5) {
        const bIdx = biomeAt(pos.x, pos.z);
        if (bIdx === 0 || bIdx === 1) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 70 + Math.random() * 40;
          const ball = new THREE.Mesh(
            new THREE.IcosahedronGeometry(.95, 1),
            bIdx === 0 ? mats.cap : mats.rockGray,
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

      /* ---- stream chunks ---- */
      ensureChunksAround(pcx, pcz);

      /* ---- wind + water + hero grass follow ---- */
      updateTimeUniforms(now / 1000);
      {
        const hx = Math.round(pos.x / 4) * 4, hz = Math.round(pos.z / 4) * 4;
        if (hx !== heroSnapX || hz !== heroSnapZ) {
          heroSnapX = hx; heroSnapZ = hz;
          heroGroup.position.set(hx, 0, hz);
          scatterHero(hx, hz);
        }
      }

      /* ---- butterflies ---- */
      {
        if (butterflies.length < 8 && Math.random() < dt * 2) {
          const ba = Math.random() * Math.PI * 2, bd = 15 + Math.random() * 30;
          const bx = pos.x + Math.sin(ba) * bd, bz = pos.z + Math.cos(ba) * bd;
          if (biomeAt(bx, bz) === 2 && !lakeAt(bx, bz) && !onRoad(bx, bz)) spawnButterfly(bx, bz);
        }
        for (let i = butterflies.length - 1; i >= 0; i--) {
          const bf = butterflies[i];
          const d2b = bf.base.distanceToSquared(pos);
          if (d2b > 120 * 120) { scene.remove(bf.group); butterflies.splice(i, 1); continue; }
          if (d2b < 60 * 60) {
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

      /* ---- day/night cycle (distance-driven preset lerp) ---- */
      const totalDist = (hudRef.current.distAcc += speed * dt);
      const cycle = (totalDist % 1400) / 1400 * 4;
      const iA = Math.floor(cycle) % 4;
      const A = DAY_PRESETS[iA];
      const Bp = DAY_PRESETS[(iA + 1) % 4];
      const tK = smooth(cycle % 1);
      light.applyPreset(A, tK, Bp);
      const ang = cycle / 4 * Math.PI * 2;
      light.updateSun(pos, ang);
      const dayFactor = (PRESET_DAYF[A.name] ?? 1) * (1 - tK) + (PRESET_DAYF[Bp.name] ?? 1) * tK;
      dayFactorRef.current = dayFactor;

      /* sky dome: sun direction + day factor + biome horizon tint */
      sunDirV.subVectors(light.sun.position, light.sun.target.position).normalize();
      sky.update(sunDirV, dayFactor, (scene.fog as THREE.Fog).color);

      /* ---- biome ambience lerp ---- */
      const bIdx = biomeAt(pos.x, pos.z);
      if (bIdx !== lastBiomeIdx) { lastBiomeIdx = bIdx; setBiomeName(BIOME_NAMES[bIdx]); }
      const T = BIOME_TINTS[bIdx];
      colB.setHex(A.fogA); colC.setHex(Bp.fogA);
      colB.lerp(colC, tK);                                  // continuous day-fog target
      colA.setHex(T.skyDay).lerp(colB, .6);
      (scene.background as THREE.Color).lerp(colA, dt * 1.5);
      colA.setHex(T.fog).lerp(colB, .5);
      (scene.fog as THREE.Fog).color.lerp(colA, dt * 1.5);

      /* ---- cinematic chase camera ---- */
      chase.update(pos, heading, spd01, dt,
        THREE.MathUtils.clamp(-wheelOri * Math.min(1, speed / 14) * 2.2, -1.4, 1.4));

      /* audio */
      const a = ensureAudio();
      a.osc.frequency.value = 42 + speed * 3.6;
      a.gain.gain.value = mutedRef.current ? 0 : Math.min(.05, speed * .0038);

      setSpeedKmh(Math.round(speed * 3.6));
      hudRef.current.px = pos.x;
      hudRef.current.pz = pos.z;
      hudRef.current.heading = heading;
      /* HUD throttle/gear sync at ~10 Hz */
      hudClock += dt;
      if (hudClock > .05) {   // 20 Hz — cluster matches physics tightly
        hudClock = 0;
        setRpm01(rpm01);
        setGear(goingForward ? gearIdx + 1 : 'R');
      }
      if (useComposer) {
        postfx.render(dt);
      } else {
        renderer.render(scene, camera);   // GPU failed the composer self-test
      }
    };
    const rollers: Roller[] = [];
    function rollersLen() { return rollers.length; }

    raf = requestAnimationFrame(tick);

    const cleanup = () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      mount.removeEventListener('mousedown', onDragStart);
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', onDragEnd);
      mount.removeEventListener('wheel', onWheel);
      const au = (window as AudioWin).__jeepAudio;
      if (au) au.gain.gain.value = 0;
      for (const [, c] of chunks) disposeChunkGroup(c.group);
      chunks.clear();
      lakeRects.length = 0;
      for (const bf of butterflies) scene.remove(bf.group);
      butterflies.length = 0;
      for (const r of rollers) scene.remove(r.mesh);
      rollers.length = 0;
      sky.dispose();
      jeep.dispose();
      postfx.dispose();
      envTex?.dispose();
      /* dispose material library textures + materials */
      for (const m of Object.values(mats) as (THREE.Material | THREE.Material[] | null | undefined)[]) {
        if (!m) continue;
        const list = Array.isArray(m) ? m : [m];
        for (const mm of list) {
          const rec = mm as unknown as Record<string, unknown>;
          for (const v of Object.values(rec)) {
            if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
          }
          mm.dispose();
        }
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    return cleanup;
  }

  /* score/best/fps sync */
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const s = hudRef.current.score;
      setScore(s);
      setFps(hudRef.current.fps);
      setBestScore(prev => {
        if (s <= prev) return prev;
        try { localStorage.setItem('jeepdrift-best', String(s)); } catch { /* ignore */ }
        return s;
      });
    }, 250);
    return () => clearInterval(id);
  }, [started]);

  /* live minimap — GTA-style rotating rectangle, redraw 10x/sec */
  const miniRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!started) return;
    const draw = () => {
      const cv = miniRef.current;
      if (!cv) return;
      const c = cv.getContext('2d');
      if (!c) return;
      renderMinimap(c, hudRef.current.px, hudRef.current.pz, hudRef.current.heading);
    };
    draw();
    const id = setInterval(draw, 100);
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
          <div className="g-hud-biome g-glass" title="Current biome">{biomeName}</div>
          {showFps && (
            <div className={`g-hud-fps g-glass${fps < 30 ? ' g-fps-low' : ''}`}>{fps} FPS</div>
          )}
        </div>

        <div className="g-hud-right">
          <div className="g-dspeedo g-glass" aria-label="Speedometer">
            {/* segmented power bar — Forza-style, top strip */}
            <div className="g-dspeedo-bar" aria-hidden="true">
              {Array.from({ length: 26 }, (_, i) => (
                <i key={i} className={`${i < Math.round(rpm01 * 26) ? 'on' : ''}${i >= 22 ? ' red' : ''}`} />
              ))}
            </div>
            <div className="g-dspeedo-main">
              <span className="g-dspeedo-gear">{gear}</span>
              <span className="g-dspeedo-num">{speedKmh}</span>
              <span className="g-dspeedo-unit">KM/H</span>
            </div>
          </div>
          <div className="g-hud-actions">
            <div className="g-pedals" aria-hidden="false">
              <button id="g-pedal-gas" className="g-pedal g-glass" aria-label="Accelerate (hold)">▲</button>
              <button id="g-pedal-brake" className="g-pedal g-glass" aria-label="Brake/Reverse (hold)">▼</button>
            </div>
            <button className={`g-hud-btn g-glass${camMode !== 'chase' ? ' g-btn-active' : ''}`} onClick={cycleCam}
              aria-label="Cycle camera" title="Camera (C)">🎥</button>
            <button className="g-hud-btn g-glass" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
            <a className="g-hud-btn g-glass" href="#/" aria-label="Exit game">✕</a>
          </div>
        </div>
      </div>

      {toast && <div className="g-toast">{toast}</div>}

      {started && (
        <div id="game-veh-status">
          {vehStatus === 'ready' ? '🏎️ FERRARI' : vehStatus === 'loading' ? '⏳ CAR LOADING…' : `🚙 JEEP${vehErr ? ' · ' + vehErr : ''}`}
          {' · C camera · hold ▲ to drive'}
        </div>
      )}

      {started && (
        <div
          className="g-minimap"
          style={{
            position: 'absolute', right: 16, bottom: 16, width: 208, height: 148,
            borderRadius: 10, padding: 4, boxSizing: 'border-box',
            background: 'rgba(8,12,18,.55)', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.22)',
            boxShadow: '0 6px 24px rgba(0,0,0,.4), inset 0 0 14px rgba(0,0,0,.35)',
            overflow: 'hidden',
            zIndex: 5,
          }}
        >
          <canvas ref={miniRef} width={208} height={148}
            style={{ width: '100%', height: '100%', display: 'block', borderRadius: 7 }} />
        </div>
      )}

      {!started && (
        <div className="g-overlay">
          <h1 className="g-title">JEEP<span className="g-title-accent">DRIFT</span></h1>
          <p className="g-sub">
            Open world with real highways, ring roads &amp; four biomes. Stick to the tarmac
            or go full off-road — hills, lakes, forests and lava fields await.
          </p>
          <div className="g-keys">
            <span>▲ ◀ ▼ ▶ / WASD drive</span>
            <span>SPACE handbrake</span>
            <span>C camera</span>
            <span>drag orbit · wheel zoom</span>
            <span>F fps</span>
          </div>
          <button className="g-start" onClick={() => { console.error('DBG start-click fired'); setStarted(true); }}>
            START<span className="g-start-accent">ENGINE</span>
          </button>
          <button className="g-exit" onClick={() => { window.location.hash = '#/'; }}>✕ Exit</button>
        </div>
      )}
    </div>
  );
};

export default GameApp;
