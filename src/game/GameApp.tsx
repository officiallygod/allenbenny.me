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
} from './gfx/terrain';
import { buildMaterials, updateTimeUniforms, type MaterialLibrary } from './gfx/materials';
import {
  buildSky, buildLighting, buildEnvironment,
  DAY_PRESETS, type SkyDome, type LightingRig,
} from './gfx/sky';
import { buildPostFX } from './gfx/postfx';
import { buildChaseCam } from './gfx/camera';
import { buildJeep } from './gfx/jeep';
import { buildChunk } from './gfx/chunks';
import type { BuiltChunk, ChunkBuildContext } from './gfx/types';
import type { ChaseCam, Jeep } from './gfx/types';

interface Pickup { mesh: THREE.Object3D; kind: 'fuel' | 'coin' | 'crate'; }
interface Roller { mesh: THREE.Mesh; vx: number; vz: number; }
interface Butterfly { group: THREE.Group; wings: THREE.Mesh[]; base: THREE.Vector3; phase: number; }

const MAP_HALF = WORLD_HALF;

/* every lake ever created (bounded map ⇒ finite); keeps spawns dry */
const lakeRects: { x: number; z: number; r: number }[] = [];
function inWater(x: number, z: number): boolean {
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

/* ---------------- biome minimap (now WITH roads) ---------------- */
const MINI_COLORS = BIOME_TINTS.map(b => b.mini);
function renderMinimap(ctx: CanvasRenderingContext2D, px: number, pz: number, heading: number) {
  const SIZE = 160, C = SIZE / 2;
  const RANGE = 5;
  const SPACING = 60;
  const scale = (SIZE / 2 - 6) / (RANGE * SPACING);
  const W2S = (wx: number, wz: number): [number, number] => [C + (wx - px) * scale, C + (wz - pz) * scale];
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
      const [sx, sy] = W2S(wx, wz);
      const half = SPACING * scale / 2 + .5;
      ctx.fillRect(sx - half, sy - half, half * 2, half * 2);
    }
  }
  /* roads: N-S, E-W, ring r260, two sinusoid diagonals */
  ctx.strokeStyle = 'rgba(40,44,52,.9)';
  ctx.lineWidth = Math.max(1.5, ROAD_HALF_WIDTH * 2 * scale);
  ctx.beginPath();
  {
    const [a] = W2S(0, -MAP_HALF - 10); const [, b2] = W2S(0, -MAP_HALF - 10);
    const [c] = W2S(0, MAP_HALF + 10); const [, d] = W2S(0, MAP_HALF + 10);
    ctx.moveTo(a, b2); ctx.lineTo(c, d);
    const [e, f] = W2S(-MAP_HALF - 10, 0); const [g2, h] = W2S(MAP_HALF + 10, 0);
    ctx.moveTo(e, f); ctx.lineTo(g2, h);
  }
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let a = 0; a <= 64; a++) {
    const th = a / 64 * Math.PI * 2;
    const rr = 260 + Math.sin(th * 5) * 8;
    const [sx, sy] = W2S(Math.cos(th) * rr, Math.sin(th) * rr);
    a === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let x = -MAP_HALF; x <= MAP_HALF; x += 20) {
    const [sx, sy] = W2S(x, 140 * Math.sin(x * .008) + 60);
    x === -MAP_HALF ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  }
  for (let z = -MAP_HALF; z <= MAP_HALF; z += 20) {
    const [sx, sy] = W2S(-120 * Math.sin(z * .007) - 70, z);
    z === -MAP_HALF ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  /* bounded-map edge */
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 1.6;
  const [ex, ey] = W2S(-MAP_HALF, -MAP_HALF);
  ctx.strokeRect(ex, ey, MAP_HALF * 2 * scale, MAP_HALF * 2 * scale);
  /* player triangle */
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

const GameApp: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef({ score: 0, distAcc: 0, px: 0, pz: 0, heading: 0, fps: 0 });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return Number(localStorage.getItem('jeepdrift-best')) || 0; } catch { return 0; }
  });
  const [speedKmh, setSpeedKmh] = useState(0);
  const [throttle01, setThrottle01] = useState(0);
  const [gear, setGear] = useState(1);
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
      (window as unknown as Record<string, unknown>).__jeepDbg = { initErr: String(e) };
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
    const jeep: Jeep = buildJeep(mats);
    scene.add(jeep.group);

    /* soft contact shadow under the jeep (always readable) */
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .26, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    scene.add(blob);

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
    const HERO_N = IS_MOBILE ? 300 : 600, HERO_R = 20;
    const heroGeo = makeBladeGeo();
    const heroA = new THREE.InstancedMesh(heroGeo, mats.grassBladeA, Math.ceil(HERO_N / 2));
    const heroB = new THREE.InstancedMesh(heroGeo, mats.grassBladeB, Math.floor(HERO_N / 2));
    const heroGroup = new THREE.Group();
    heroGroup.add(heroA, heroB);
    scene.add(heroGroup);
    let heroSnapX = 1e9, heroSnapZ = 1e9;
    function scatterHero(hx: number, hz: number) {
      let placed = 0;
      for (let i = 0; i < HERO_N * 2 && placed < HERO_N; i++) {
        const wx = hx + (hash2(i * 1.7 + hx * .37, hz * 3.1) - .5) * HERO_R * 2;
        const wz = hz + (hash2(hz * 5.3 + i, hx * 7.7) - .5) * HERO_R * 2;
        if (inWater(wx, wz) || onRoad(wx, wz)) continue;
        dummy.position.set(wx - hx, terrainH(wx, wz), wz - hz);
        dummy.rotation.set((hash2(i, 11) - .5) * .2, hash2(i, 22) * 6.28, (hash2(i, 33) - .5) * .2);
        dummy.scale.set(1, .8 + hash2(i, 44) * .35, 1);
        dummy.updateMatrix();
        ((placed % 2 ? heroB : heroA) as THREE.InstancedMesh).setMatrixAt(Math.floor(placed / 2), dummy.matrix);
        placed++;
      }
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.001); dummy.position.set(0, -50, 0);
      for (let j = Math.ceil(placed / 2); j < heroA.count; j++) { dummy.updateMatrix(); heroA.setMatrixAt(j, dummy.matrix); }
      for (let j = Math.floor(placed / 2); j < heroB.count; j++) { dummy.updateMatrix(); heroB.setMatrixAt(j, dummy.matrix); }
      heroA.instanceMatrix.needsUpdate = true;
      heroB.instanceMatrix.needsUpdate = true;
    }

    /* ---------- input ---------- */
    const keys: Record<string, boolean> = {};
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
    const throttleRef = { current: 0 };   // gradual throttle spool
    let vFwdPrev = 0;                     // previous forward speed (drag sign)
    let hudClock = 0;

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

      /* ---- drive (folio-style vehicle model — unchanged physics) ---- */
      const gasPressed = !!(keys['arrowup'] || keys['w']);
      const revPressed = !!(keys['arrowdown'] || keys['s']);
      const accelInput = (gasPressed ? 1 : 0) - (revPressed ? 1 : 0);
      const turn = (keys['arrowleft'] || keys['a'] ? 1 : 0) - (keys['arrowright'] || keys['d'] ? 1 : 0);
      steer += ((turn * 1) - steer) * Math.min(1, dt * 7);

      const dir = dirV.set(Math.sin(heading), 0, Math.cos(heading));
      const speed = vel.length();
      const forwardRatio = speed > .05 ? vel.clone().normalize().dot(dir) : 1;
      const goingForward = forwardRatio > .5;

      /* ---- drive: gradual throttle, real drag, top speed 160+ km/h ---- */
      const topSpeed = 45;                       // m/s ≈ 162 km/h
      const throttleTarget = Math.abs(accelInput);
      const spoolK = accelInput !== 0 ? .55 : 1.4;   // spool up slow, lift-off fast
      const thr = (throttleRef.current += (throttleTarget - throttleRef.current) * Math.min(1, dt * spoolK));
      const gearIdx = Math.min(5, Math.floor((thr * speed) / topSpeed * 6));

      /* aero + rolling drag grows with v²; uphill adds more */
      const drag = .011 * speed * speed / topSpeed + .5;
      let engineForce = accelInput * 26 * thr - Math.sign(vFwdPrev) * drag * (speed > .3 ? 1 : 0);
      if (!gasPressed && !revPressed) engineForce -= Math.sign(vFwdPrev) * 1.1;  // engine braking

      const forwardRatio2 = speed > .05 ? vel.clone().normalize().dot(dir) : 1;
      let brake = 0;
      if (speed > .5 && ((accelInput > 0 && goingForward === false && forwardRatio2 < -.5) || (accelInput < 0 && goingForward && forwardRatio2 > .5))) {
        brake = 20;
        engineForce = 0;
      }
      if (keys[' ']) brake = 60;
      const handbraking = !!keys[' '];

      vel.multiplyScalar(Math.pow(.62, dt));
      vel.addScaledVector(dir, engineForce * dt);
      if (brake > 0) {
        const bFactor = Math.max(0, 1 - (brake * dt) / Math.max(speed, .6));
        vel.multiplyScalar(bFactor);
      }
      if (vel.length() > topSpeed + 6) vel.setLength(topSpeed + 6);

      const wheelBase = 2.6;
      const speedFwd = Math.max(2.5, speed * forwardRatio);
      const turnRate = (speedFwd / wheelBase) * Math.tan(steer * .48);
      heading += turnRate * dt;

      const rightX = Math.cos(heading), rightZ = -Math.sin(heading);
      let vFwd = vel.x * dir.x + vel.z * dir.z;
      let vLat = vel.x * rightX + vel.z * rightZ;
      const grip = handbraking ? 1.8 : 6.5;
      vLat *= Math.pow(.002, dt / grip * 10);
      vFwd *= Math.pow(.62, dt);
      vFwd += engineForce * dt;
      vel.set(dir.x * vFwd + rightX * vLat, 0, dir.z * vFwd + rightZ * vLat);
      pos.addScaledVector(vel, dt);
      vFwdPrev = vFwd;

      /* bounded world soft walls */
      if (Math.abs(pos.x) > MAP_HALF) {
        pos.x = Math.sign(pos.x) * MAP_HALF;
        if (Math.sign(vel.x) === Math.sign(pos.x)) vel.x *= -.3;
      }
      if (Math.abs(pos.z) > MAP_HALF) {
        pos.z = Math.sign(pos.z) * MAP_HALF;
        if (Math.sign(vel.z) === Math.sign(pos.z)) vel.z *= -.3;
      }

      /* stick to terrain, tilt with slope */
      pos.y = terrainH(pos.x, pos.z);
      terrainNormalInto(nrm, pos.x, pos.z);
      const slopeDot = dir.dot(tmpV.set(nrm.x, 0, nrm.z).normalize());
      vel.addScaledVector(dir, -slopeDot * 6 * dt);

      jeep.group.position.copy(pos).addScaledVector(nrm, .05);
      q.setFromUnitVectors(upV, nrm);
      jeep.group.quaternion.copy(q);
      jeep.group.rotateY(heading);

      /* body roll into corners + pitch under accel/brake (visual only) */
      const targetRoll = THREE.MathUtils.clamp(vLat * .028, -.09, .09);
      const accel = (vFwd - prevVFwd) / Math.max(dt, .001); prevVFwd = vFwd;
      const targetPitch = THREE.MathUtils.clamp(-accel * .0045, -.05, .06);
      bodyRoll += (targetRoll - bodyRoll) * Math.min(1, dt * 6);
      bodyPitch += (targetPitch - bodyPitch) * Math.min(1, dt * 6);
      jeep.group.rotateZ(bodyRoll);
      jeep.group.rotateX(bodyPitch);

      /* suspension: sample ground under each wheel, offset containers */
      {
        const fx = Math.sin(heading), fz = Math.cos(heading);
        const wx = [fx * 1.28, fx * 1.28, -fx * 1.28, -fx * 1.28];
        const wz = [fz * 1.28, fz * 1.28, -fz * 1.28, -fz * 1.28];
        const sx = [rightX * -1.08, rightX * 1.08, rightX * -1.08, rightX * 1.08];
        const sz = [rightZ * -1.08, rightZ * 1.08, rightZ * -1.08, rightZ * 1.08];
        for (let i = 0; i < 4; i++) {
          const gy = terrainH(pos.x + wx[i] + sx[i], pos.z + wz[i] + sz[i]);
          const target = THREE.MathUtils.clamp((gy - pos.y) * .8, -.22, .22);
          susp[i] += (target - susp[i]) * Math.min(1, dt * 10);
        }
        jeep.setSuspension(susp[0], susp[1], susp[2], susp[3]);
      }

      /* wheels: container Y = steer (front), mesh X = roll */
      const spin = (speed * dt * 2.2) * (goingForward ? 1 : -1);
      for (const w of jeep.wheels) w.rotation.x += spin;
      jeep.wheelContainers[0].rotation.y = steer * .5;
      jeep.wheelContainers[1].rotation.y = steer * .5;

      /* brake lights + reverse-light glow */
      const targetGlow = brake > 2 || handbraking ? 5 : 1.1;
      brakeGlow += (targetGlow - brakeGlow) * Math.min(1, dt * 12);
      jeep.brakeLights.emissiveIntensity = brakeGlow;

      /* contact shadow follows jeep */
      blob.position.set(pos.x, pos.y + .04, pos.z);
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
          if (biomeAt(bx, bz) === 2 && !inWater(bx, bz) && !onRoad(bx, bz)) spawnButterfly(bx, bz);
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

      /* headlights ramp up at dusk/night */
      jeep.headBeam.intensity = 8 + (1 - dayFactor) * 85;

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
      chase.update(pos, heading, Math.min(1, speed / topSpeed), dt,
        THREE.MathUtils.clamp(vLat * .06, -1.4, 1.4));

      /* audio */
      const a = ensureAudio();
      a.osc.frequency.value = 42 + speed * 4.2;
      a.gain.gain.value = mutedRef.current ? 0 : Math.min(.05, speed * .0038);

      setSpeedKmh(Math.round(speed * 3.6));
      hudRef.current.px = pos.x;
      hudRef.current.pz = pos.z;
      hudRef.current.heading = heading;
      /* HUD throttle/gear sync at ~10 Hz */
      hudClock += dt;
      if (hudClock > .1) {
        hudClock = 0;
        setThrottle01(Math.round(throttleRef.current * 20) / 20);
        setGear(gearIdx + 1);
      }
      postfx.render(dt);
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

  /* live biome minimap — redraw ~2x/sec */
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
          <div className="g-hud-biome g-glass" title="Current biome">{biomeName}</div>
          {showFps && (
            <div className={`g-hud-fps g-glass${fps < 30 ? ' g-fps-low' : ''}`}>{fps} FPS</div>
          )}
        </div>

        <div className="g-hud-right">
          <div className="g-hud-speedo g-glass">
            <svg viewBox="0 0 100 60" className="g-speedo-svg" aria-hidden="true">
              <path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" strokeLinecap="round" />
              <path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke="#4da3ff" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${Math.min(1, speedKmh / 180) * 126} 999`} />
            </svg>
            <div className="g-speedo-num">{speedKmh}<small>km/h</small></div>
            <div className="g-speedo-meta">
              <span className="g-gear">{gear}</span>
              <span className="g-throttle" title="Throttle">
                <i style={{ transform: `scaleY(${Math.max(.04, throttle01)})` }} />
              </span>
            </div>
          </div>
          <div className="g-hud-actions">
            <button className={`g-hud-btn g-glass${camMode !== 'chase' ? ' g-btn-active' : ''}`} onClick={cycleCam}
              aria-label="Cycle camera" title="Camera (C)">🎥</button>
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
