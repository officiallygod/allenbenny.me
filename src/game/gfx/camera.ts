import * as THREE from 'three';
import { IS_MOBILE } from './noise';
import { terrainH } from './terrain';
import type { CamMode, ChaseCam } from './types';

/* ================================================================
   gfx/camera.ts — cinematic multi-camera rig.
   MODES (C key / HUD button cycles):
     chase  — BEHIND the jeep (default): yaw trails heading with
              damping so drift shows the car's side; speed pushes
              radius + FOV; slight lateral offset opposite drift.
     hood   — driver's-eye: locked ahead of the cabin, looks forward.
     far    — cinematic wide: higher + further back.
     free   — orbit: mouse-drag yaw/pitch, wheel zoom.
   Zero per-frame allocations — scratch vectors are module-level.
   ================================================================ */

const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _side = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _lift = new THREE.Vector3();

const TAU = Math.PI * 2;
const dampFactor = (dt: number, k: number) => 1 - Math.exp(-dt * k);

function angleDelta(target: number, current: number): number {
  let d = (target - current) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function buildChaseCam(aspect: number): ChaseCam {
  const baseFov = IS_MOBILE ? 66 : 58;
  const camera = new THREE.PerspectiveCamera(baseFov, aspect, 0.3, 900);
  camera.position.set(0, 5, -11);

  let mode: CamMode = 'chase';
  /* trailing yaw for orbit modes */
  let yaw = Math.PI;          // starts behind a north-facing jeep
  let radius = 10;
  let freeYaw = Math.PI * .75;
  let freePitch = .38;
  let freeDist = 13;

  const rig: ChaseCam = {
    camera,
    get mode() { return mode; },

    cycleMode() {
      mode = mode === 'chase' ? 'hood' : mode === 'hood' ? 'far' : mode === 'far' ? 'free' : 'chase';
      if (mode === 'free') { freeYaw = yaw + Math.PI * .25; }
      return mode;
    },

    orbit(dyYaw: number, dyPitch: number) {
      if (mode !== 'free') return;
      freeYaw -= dyYaw * .0045;
      freePitch = THREE.MathUtils.clamp(freePitch + dyPitch * .0045, .08, 1.25);
    },

    zoom(d: number) {
      if (mode === 'free') freeDist = THREE.MathUtils.clamp(freeDist + d * .01, 5, 40);
      else radius = THREE.MathUtils.clamp(radius + d * .01, 6, 30);
    },

    update(pos, heading, speed01, dt, lateralDrift) {
      const fovPush = speed01 * 11;

      if (mode === 'hood') {
        /* driver's eye: sit at the cabin, look where the jeep points */
        _fwd.set(Math.sin(heading), 0, Math.cos(heading));
        _lift.set(0, 1.78, 0);
        _desired.copy(pos).addScaledVector(_fwd, .55).add(_lift);
        camera.position.lerp(_desired, dampFactor(dt, 22));
        _look.copy(pos).addScaledVector(_fwd, 14).setY(pos.y + 1.4);
        camera.lookAt(_look);
        const targetFov = baseFov + 8 + fovPush;
        camera.fov += (targetFov - camera.fov) * dampFactor(dt, 6);
        camera.updateProjectionMatrix();
        return;
      }

      const isFar = mode === 'far';
      const isFree = mode === 'free';

      /* desired orbit angle */
      let targetYaw: number;
      if (isFree) targetYaw = freeYaw;
      else {
        /* trail the heading — slower than the car so drift reads */
        const trailK = isFar ? dt * 2.2 : dt * 3.1;
        yaw += angleDelta(heading + Math.PI, yaw) * Math.min(trailK, .5);
        targetYaw = yaw;
      }

      const baseR = isFree ? freeDist : (isFar ? 19 : 9.6);
      const speedR = isFree ? 0 : speed01 * (isFar ? 7 : 3.6);
      const wantR = baseR + speedR;
      radius += (wantR - radius) * dampFactor(dt, 5);

      const pitch = isFree ? freePitch : (isFar ? .42 : .30);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      _desired.set(
        pos.x + Math.sin(targetYaw) * cosP * radius,
        pos.y + sinP * radius,
        pos.z + Math.cos(targetYaw) * cosP * radius,
      );

      /* cinematic lateral shift opposite the drift (orbit modes) */
      if (!isFree && Math.abs(lateralDrift) > .05) {
        _side.set(Math.cos(targetYaw), 0, -Math.sin(targetYaw));
        _desired.addScaledVector(_side, -lateralDrift * (isFar ? 1.4 : 2.1));
        _desired.y += Math.abs(lateralDrift) * .55;
      }

      /* terrain clearance */
      const minY = terrainH(_desired.x, _desired.z) + 2.1;
      if (_desired.y < minY) _desired.y = minY;

      camera.position.lerp(_desired, dampFactor(dt, isFree ? 9 : 7));

      _look.set(pos.x, pos.y + (isFar ? 1.2 : 1.65), pos.z);
      camera.lookAt(_look);

      const targetFov = (isFar ? baseFov - 6 : baseFov) + fovPush;
      camera.fov += (targetFov - camera.fov) * dampFactor(dt, 6);
      camera.updateProjectionMatrix();
    },

    resize(newAspect: number) {
      camera.aspect = newAspect;
      camera.updateProjectionMatrix();
    },
  };

  return rig;
}
