import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { MaterialLibrary } from './types';

/* ================================================================
   gfx/ferrari.ts — the shliamin/JS-3D-Car Ferrari (DRACO glTF),
   adapted to the Jeep-like interface: named-part materials (body /
   rims / glass) overridden demo-style, AO contact-shadow plane,
   headlight beams, steering + rolling wheel adapters.

   Model space: nose points −Z (demo convention). We wrap it in an
   inner group rotated Y·π so the nose lands on +Z (game convention).
   ================================================================ */

export const FERRARI_URL = '/game/ferrari.glb';
const DRACO_PATH = '/game/draco/';

export interface Ferrari {
  group: THREE.Group;
  /** spin via rotation.x (game feeds += delta) */
  rollers: THREE.Object3D[];
  /** steer via rotation.z in model space (game feeds value directly) */
  steerRoots: THREE.Object3D[];
  /** pump emissiveIntensity on braking */
  brakeMat: THREE.MeshStandardMaterial;
  beams: THREE.SpotLight[];
  dispose(): void;
}

/** wrap each wheel root's children in an inner pivot: root steers, pivot spins */
function splitWheel(root: THREE.Object3D): { steer: THREE.Object3D; roller: THREE.Object3D } | null {
  if (!root) return null;
  const inner = new THREE.Group();
  while (root.children.length > 0) inner.add(root.children[0]);
  root.add(inner);
  return { steer: root, roller: inner };
}

export function loadFerrari(mats: MaterialLibrary): Promise<Ferrari> {
  return new Promise((resolve, reject) => {
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);   // modern wasm decoders live here
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      FERRARI_URL,
      gltf => {
        try {
          const model = (gltf.scene.children[0] ?? gltf.scene) as THREE.Group;

          /* demo-style part lookup */
          const body = model.getObjectByName('body');
          const rimNames = ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'];
          const rims = rimNames.map(n => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];
          const glass = model.getObjectByName('glass');
          const wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']
            .map(n => model.getObjectByName(n))
            .filter(Boolean) as THREE.Object3D[];

          /* materials — deep red metallic like the demo's palette */
          const paint = new THREE.MeshStandardMaterial({
            color: 0x990000, metalness: .9, roughness: .22, envMapIntensity: 1.35,
          });
          const chrome = new THREE.MeshStandardMaterial({
            color: 0x555555, metalness: 1, roughness: .2, envMapIntensity: 1.6,
          });
          const smokedGlass = new THREE.MeshStandardMaterial({
            color: 0xffffff, metalness: 1, roughness: 0, opacity: .22,
            transparent: true, premultipliedAlpha: true,
          });
          if (body) body.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = paint; });
          for (const r of rims) r.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = chrome; });
          if (glass) glass.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = smokedGlass; });

          model.traverse(o => {
            const m = o as THREE.Mesh;
            if (m.isMesh) { m.castShadow = true; }
          });

          /* baked AO contact shadow plane (from the reference repo) */
          new THREE.TextureLoader().load('/game/ferrari_ao.png', tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const shadow = new THREE.Mesh(
              new THREE.PlaneGeometry(.655 * 4, 1.3 * 4).rotateX(-Math.PI / 2),
              new THREE.MeshBasicMaterial({ map: tex, opacity: .8, transparent: true, depthWrite: false }),
            );
            shadow.renderOrder = 2;
            shadow.position.y = .02;
            model.add(shadow);
          });

          /* nose −Z → +Z for the game's heading convention */
          const wrapper = new THREE.Group();
          model.rotation.y = Math.PI;
          wrapper.add(model);

          /* steering/spin adapters (CarControls pattern) */
          const steerRoots: THREE.Object3D[] = [];
          const rollers: THREE.Object3D[] = [];
          for (let i = 0; i < wheels.length; i++) {
            const parts = splitWheel(wheels[i]);
            if (!parts) continue;
            steerRoots.push(parts.steer);
            rollers.push(parts.roller);
          }

          /* headlight beams (kept from the old build) */
          const beams: THREE.SpotLight[] = [];
          const beamTarget = new THREE.Object3D();
          beamTarget.position.set(0, 0, 24);
          wrapper.add(beamTarget);
          const main = new THREE.SpotLight(0xfff3c4, 40, 55, Math.PI / 8, .55, 1.6);
          main.position.set(0, .7, 1.9);
          main.target = beamTarget;
          wrapper.add(main);
          beams.push(main);
          const flood = new THREE.SpotLight(0xffedc2, 14, 38, Math.PI / 3, .7, 1.8);
          flood.position.set(0, .6, 1.9);
          flood.target = beamTarget;
          wrapper.add(flood);
          beams.push(flood);

          /* brake light strip — wrapper +Z is the NOSE (model flipped),
             so tail lights live at −Z */
          const brakeMat = mats.taillightOn.clone();
          for (const bx of [-.72, .72]) {
            const tl = new THREE.Mesh(new THREE.BoxGeometry(.34, .09, .06), brakeMat);
            tl.position.set(bx, .58, -2.08);
            wrapper.add(tl);
          }

          resolve({ group: wrapper, rollers, steerRoots, brakeMat, beams, dispose() {
            draco.dispose();
            wrapper.parent?.remove(wrapper);
            paint.dispose(); chrome.dispose(); smokedGlass.dispose(); brakeMat.dispose();
          } });
        } catch (e) {
          draco.dispose();
          reject(e);
        }
      },
      undefined,
      err => { draco.dispose(); reject(err); },
    );
  });
}
