import * as THREE from 'three';
import type { Jeep, MaterialLibrary } from './types';

/* ================================================================
   gfx/jeep.ts — sculpted clearcoat offroader.
   Body = extruded side-profile Shape (real hood slope, windshield
   rake, pickup bed, WHEEL ARCHES cut into the silhouette) with
   bevelled edges, MeshPhysicalMaterial clearcoat paint.
   Folio wheel pattern: container.rotation.y = steer,
   mesh.rotation.x = roll — never combined on one Euler.
   ================================================================ */

const WHEEL_BASE_Y = 0.72;   // raised: keeps sculpted arches clear of the ground

/* side profile in (lengthZ, heightY); extruded across X width */
function bodyProfile(): THREE.Shape {
  const s = new THREE.Shape();
  /* bottom edge, rear → front, with wheel-arch cutouts */
  s.moveTo(-1.92, 0.42);
  s.lineTo(1.28 - 0.76, 0.42);
  s.absarc(1.28, 0.42, 0.76, Math.PI, 0, true);   // front arch
  s.lineTo(1.94, 0.48);
  /* nose */
  s.lineTo(1.96, 0.98);
  s.lineTo(1.78, 1.16);
  /* hood */
  s.lineTo(0.82, 1.26);
  /* windshield rake */
  s.lineTo(0.44, 1.92);
  /* roof */
  s.lineTo(-0.12, 1.97);
  /* cabin rear */
  s.lineTo(-0.66, 1.84);
  /* bed rail */
  s.lineTo(-0.74, 1.16);
  s.lineTo(-1.56, 1.1);
  /* tailgate */
  s.lineTo(-1.94, 1.04);
  s.closePath();
  return s;
}

function extrudedBody(): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(bodyProfile(), {
    depth: 1.98,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 10,
  });
  /* shape XY → car (Z length, Y height); extrude depth → X width */
  geo.rotateY(-Math.PI / 2);
  geo.translate((1.98 + 0.12) / 2, 0, 0);   // center incl. bevel spread
  return geo;
}

function buildWheel(mats: MaterialLibrary, side: number): { container: THREE.Group; roller: THREE.Mesh } {
  const container = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.46, 28);
  tireGeo.rotateZ(Math.PI / 2);
  const roller = new THREE.Mesh(tireGeo, mats.tire);
  roller.castShadow = true;
  container.add(roller);
  const rimGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.48, 20);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, mats.rim);
  rim.position.x = side * 0.01;
  roller.add(rim);
  /* brake caliper peeking through the spokes */
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.2), mats.taillightOn);
  caliper.position.set(side * 0.02, 0.26, 0.05);
  roller.add(caliper);
  /* 5 spokes — visible spin cue */
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.075, 0.17), mats.rim);
    spoke.rotation.x = (i / 5) * Math.PI;
    roller.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.52, 10), mats.jeepDark);
  hub.geometry.rotateZ(Math.PI / 2);
  roller.add(hub);
  return { container, roller };
}

export function buildJeep(mats: MaterialLibrary): Jeep {
  const group = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  const track = <G extends THREE.BufferGeometry>(g: G): G => { disposables.push(g); return g; };

  /* ---- main body ---- */
  const bodyGeo = track(extrudedBody());
  const body = new THREE.Mesh(bodyGeo, mats.jeepPaint);
  body.castShadow = true;
  group.add(body);

  /* underbody plate so arches don't see through */
  const under = new THREE.Mesh(track(new THREE.BoxGeometry(1.86, 0.24, 3.5)), mats.jeepDark);
  under.position.y = 0.46;
  group.add(under);

  /* ---- glass canopy: windshield + side + rear panels ---- */
  {
    /* windshield matches the profile rake (0.82,1.26)→(0.44,1.92) */
    const wsLen = Math.hypot(0.82 - 0.44, 1.92 - 1.26) + 0.1;
    const ws = new THREE.Mesh(track(new THREE.PlaneGeometry(1.72, wsLen)), mats.jeepGlass);
    ws.position.set(0, 1.61, 0.65);
    ws.rotation.x = -Math.atan2(0.38, 0.66);   // lean back along the rake
    group.add(ws);
    const rw = new THREE.Mesh(track(new THREE.PlaneGeometry(1.68, 0.62)), mats.jeepGlass);
    rw.position.set(0, 1.63, -0.71);
    rw.rotation.x = Math.atan2(0.1, 0.62);
    rw.rotation.y = Math.PI;
    group.add(rw);
    for (const sx of [-0.985, 0.985]) {
      const sideGlass = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, 0.5, 1.5)), mats.jeepGlass);
      sideGlass.position.set(sx, 1.6, -0.35);
      group.add(sideGlass);
    }
  }

  /* ---- fender flares: half tori over each arch ---- */
  for (const fz of [1.28, -1.28]) {
    const flareGeo = track(new THREE.TorusGeometry(0.8, 0.085, 8, 14, Math.PI));
    const flare = new THREE.Mesh(flareGeo, mats.jeepDark);
    flare.position.set(fz > 0 ? 0.99 : -0.99, 0.44, fz);
    flare.rotation.y = Math.PI / 2;
    flare.castShadow = true;
    group.add(flare);
    const flare2 = new THREE.Mesh(flareGeo, mats.jeepDark);
    flare2.position.set(fz > 0 ? -0.99 : 0.99, 0.44, fz);
    flare2.rotation.y = Math.PI / 2;
    flare2.castShadow = true;
    group.add(flare2);
  }

  /* ---- bumpers, grille, lights ---- */
  const bumperF = new THREE.Mesh(track(new THREE.BoxGeometry(2.12, 0.28, 0.26)), mats.jeepDark);
  bumperF.position.set(0, 0.52, 2.0);
  bumperF.castShadow = true;
  group.add(bumperF);
  const bumperR = new THREE.Mesh(track(new THREE.BoxGeometry(2.12, 0.28, 0.26)), mats.jeepDark);
  bumperR.position.set(0, 0.52, -2.0);
  bumperR.castShadow = true;
  group.add(bumperR);

  for (const hx of [-0.72, 0.72]) {
    const hl = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, 0.2, 0.1)), mats.headlightOn);
    hl.position.set(hx, 0.92, 1.99);
    group.add(hl);
  }
  /* grille + slats */
  const grille = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.26, 0.08)), mats.jeepDark);
  grille.position.set(0, 0.9, 1.97);
  group.add(grille);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.2, 0.05)), mats.tire);
    slat.position.set(-0.34 + i * 0.17, 0.9, 2.02);
    group.add(slat);
  }
  /* taillights — brakeLights material CLONE exposed for glow pumping */
  const brakeLights = mats.taillightOn.clone();
  for (const tx of [-0.86, 0.86]) {
    const tl = new THREE.Mesh(track(new THREE.BoxGeometry(0.3, 0.16, 0.09)), brakeLights);
    tl.position.set(tx, 0.9, -1.99);
    group.add(tl);
    const tl2 = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.1, 0.09)), brakeLights);
    tl2.position.set(tx * 0.45, 0.9, -2.0);
    group.add(tl2);
  }

  /* ---- roof rack + light bar (amber emissive cubes feed bloom) ---- */
  for (const [px, pz] of [[-0.8, 0.3], [0.8, 0.3], [-0.8, -1.25], [0.8, -1.25]] as const) {
    const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.07, 0.2, 0.07)), mats.jeepDark);
    post.position.set(px, 2.06, pz);
    group.add(post);
  }
  for (const rz of [0.3, -1.25]) {
    const rail = new THREE.Mesh(track(new THREE.BoxGeometry(1.76, 0.06, 0.07)), mats.jeepDark);
    rail.position.set(0, 2.17, rz);
    group.add(rail);
  }
  for (const rx of [-0.88, 0.88]) {
    const railL = new THREE.Mesh(track(new THREE.BoxGeometry(0.07, 0.06, 1.62)), mats.jeepDark);
    railL.position.set(rx, 2.17, -0.48);
    group.add(railL);
  }
  const lightBar = new THREE.Mesh(track(new THREE.BoxGeometry(1.66, 0.15, 0.17)), mats.jeepDark);
  lightBar.position.set(0, 2.28, 0.26);
  lightBar.castShadow = true;
  group.add(lightBar);
  for (let li = 0; li < 4; li++) {
    const cube = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.11, 0.08)), mats.headlightOn);
    cube.position.set(-0.6 + li * 0.4, 2.29, 0.36);
    group.add(cube);
  }

  /* ---- mirrors, skirts, skid plate, exhaust, antenna, spare ---- */
  for (const mx of [-1, 1]) {
    const stalk = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.05, 0.05)), mats.jeepDark);
    stalk.position.set(mx * 1.05, 1.72, 0.42);
    group.add(stalk);
    const mirror = new THREE.Mesh(track(new THREE.BoxGeometry(0.09, 0.22, 0.3)), mats.jeepDark);
    mirror.position.set(mx * 1.16, 1.76, 0.42);
    mirror.castShadow = true;
    group.add(mirror);
  }
  for (const sx of [-1.04, 1.04]) {
    const skirt = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.16, 1.3)), mats.jeepDark);
    skirt.position.set(sx, 0.44, 0);
    group.add(skirt);
  }
  const skid = new THREE.Mesh(track(new THREE.BoxGeometry(1.8, 0.06, 0.6)), mats.jeepDark);
  skid.position.set(0, 0.34, 1.82);
  skid.rotation.x = -0.35;
  group.add(skid);
  const exhaust = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 10)), mats.tire);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.72, 0.4, -2.06);
  group.add(exhaust);
  const antenna = new THREE.Mesh(track(new THREE.CylinderGeometry(0.014, 0.014, 0.8, 5)), mats.jeepDark);
  antenna.position.set(0.96, 2.2, -0.5);
  antenna.rotation.z = -0.12;
  group.add(antenna);
  const antTip = new THREE.Mesh(track(new THREE.SphereGeometry(0.04, 6, 5)), mats.taillightOn);
  antTip.position.set(0.91, 2.59, -0.5);
  group.add(antTip);
  /* spare wheel lying in the bed */
  const spareGeo = track(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16));
  const spare = new THREE.Mesh(spareGeo, mats.tire);
  spare.position.set(0, 1.28, -1.35);
  spare.castShadow = true;
  group.add(spare);
  const spareRimGeo = track(new THREE.CylinderGeometry(0.2, 0.2, 0.21, 12));
  const spareRim = new THREE.Mesh(spareRimGeo, mats.rim);
  spare.add(spareRim);
  /* wipers */
  for (const wx of [-0.4, 0.4]) {
    const wiper = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.03, 0.04)), mats.jeepDark);
    wiper.position.set(wx, 1.44, 0.72);
    wiper.rotation.z = 0.5;
    group.add(wiper);
  }

  /* ---- wheels ---- */
  const wheels: THREE.Mesh[] = [];
  const wheelContainers: THREE.Group[] = [];
  for (const [wx, wz] of [[-1.08, 1.28], [1.08, 1.28], [-1.08, -1.28], [1.08, -1.28]] as const) {
    const { container, roller } = buildWheel(mats, wx < 0 ? -1 : 1);
    container.position.set(wx, WHEEL_BASE_Y, wz);
    group.add(container);
    wheels.push(roller);
    wheelContainers.push(container);
  }

  /* ---- headlights: tight beam + wide road wash ---- */
  const headBeam = new THREE.SpotLight(0xfff3c4, 60, 60, Math.PI / 7, 0.55, 1.6);
  headBeam.position.set(0, 1.1, 1.7);
  const beamTarget = new THREE.Object3D();
  beamTarget.position.set(0, 0, 22);
  group.add(beamTarget);
  headBeam.target = beamTarget;
  group.add(headBeam);
  const flood = new THREE.SpotLight(0xffedc2, 20, 40, Math.PI / 3, 0.7, 1.8);
  flood.position.set(0, 1.0, 1.7);
  flood.target = beamTarget;
  group.add(flood);

  return {
    group,
    wheels,
    wheelContainers,
    headBeam,
    brakeLights,
    setSuspension(fl, fr, rl, rr) {
      /* GameApp feeds already-smoothed offsets; apply instantly */
      wheelContainers[0].position.y = WHEEL_BASE_Y + fl;
      wheelContainers[1].position.y = WHEEL_BASE_Y + fr;
      wheelContainers[2].position.y = WHEEL_BASE_Y + rl;
      wheelContainers[3].position.y = WHEEL_BASE_Y + rr;
    },
    dispose() {
      for (const g of disposables) g.dispose();
      headBeam.dispose();
      flood.dispose();
      brakeLights.dispose();
      group.parent?.remove(group);
    },
  };
}
