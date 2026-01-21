import React, { useEffect, useRef } from 'react';
import { Box, useToken } from '@chakra-ui/react';
import { motion, useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

const MotionBox = motion(Box);

const HeroBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [cyan500, blue500, purple500] = useToken('colors', ['cyan.300', 'blue.400', 'purple.400']);
  const MOBILE_BREAKPOINT = 720;
  const MOBILE_STAR_COUNT = 360;
  const DESKTOP_STAR_COUNT = 720;
  const GALAXY_MOBILE_COUNT = 1400;
  const GALAXY_DESKTOP_COUNT = 2400;
  const GALAXY_ARMS = 4;
  const GALAXY_SPIN_STRENGTH = 0.5;
  const GALAXY_RADIUS_MIN = 0.6;
  const GALAXY_RADIUS_MAX = 12;
  const GALAXY_RANDOM_XZ_SPREAD = 0.7;
  const GALAXY_RANDOM_Y_SPREAD = 0.35;
  const GALAXY_Y_FLATTEN = 0.6;
  const GALAXY_COLOR_LERP = 14;
  const SHOOTING_STAR_SPAWN_X = 18;
  const SHOOTING_STAR_SPAWN_Y = 8;
  const SHOOTING_STAR_SPAWN_Y_BASE = 4;
  const SHOOTING_STAR_SPAWN_Z = -10;
  const SHOOTING_STAR_SPAWN_Z_VARIANCE = 6;
  const SHOOTING_STAR_VELOCITY_X = 4;
  const SHOOTING_STAR_VELOCITY_X_VARIANCE = 3;
  const SHOOTING_STAR_VELOCITY_Y = 2;
  const SHOOTING_STAR_VELOCITY_Y_VARIANCE = 2.5;
  const SHOOTING_STAR_VELOCITY_Z = 6;
  const SHOOTING_STAR_VELOCITY_Z_VARIANCE = 2;
  const SHOOTING_STAR_MIN_LIFE = 1.5;
  const SHOOTING_STAR_LIFE_VARIANCE = 1.5;
  const SHOOTING_STAR_FADE_DURATION = 1.8;
  const SHOOTING_STAR_COUNT = 4;
  const DEFAULT_WIDTH = 1;
  const DEFAULT_HEIGHT = 1;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldReduceMotion) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 18);

    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(blue500 || '#0b1224').getHex();
    scene.fog = new THREE.FogExp2(fogColor, 0.045);

    const starCount = container.clientWidth < MOBILE_BREAKPOINT ? MOBILE_STAR_COUNT : DESKTOP_STAR_COUNT;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const basePositions = new Float32Array(starCount * 3);
    const speeds = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(cyan500 || '#22d3ee'),
      new THREE.Color(blue500 || '#3b82f6'),
      new THREE.Color(purple500 || '#a855f7'),
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 10 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 10;
      const idx = i * 3;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      basePositions[idx] = x;
      basePositions[idx + 1] = y;
      basePositions[idx + 2] = z;

      speeds[i] = 0.5 + Math.random() * 0.8;

      const color = palette[i % palette.length];
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.24,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const galaxyCount = container.clientWidth < MOBILE_BREAKPOINT ? GALAXY_MOBILE_COUNT : GALAXY_DESKTOP_COUNT;
    const galaxyGeometry = new THREE.BufferGeometry();
    const galaxyPositions = new Float32Array(galaxyCount * 3);
    const galaxyColors = new Float32Array(galaxyCount * 3);
    const galaxyInnerColor = new THREE.Color(purple500 || '#7c3aed');
    const galaxyOuterColor = new THREE.Color(cyan500 || '#22d3ee');

    for (let i = 0; i < galaxyCount; i++) {
      const radius = Math.random() * GALAXY_RADIUS_MAX + GALAXY_RADIUS_MIN;
      const armIndex = i % GALAXY_ARMS;
      const branchAngle = ((armIndex / GALAXY_ARMS) * Math.PI * 2);
      const spinAngle = radius * GALAXY_SPIN_STRENGTH;

      const randomX = (Math.random() - 0.5) * GALAXY_RANDOM_XZ_SPREAD * radius;
      const randomY = (Math.random() - 0.5) * GALAXY_RANDOM_Y_SPREAD * radius;
      const randomZ = (Math.random() - 0.5) * GALAXY_RANDOM_XZ_SPREAD * radius;

      const x = Math.cos(branchAngle + spinAngle) * radius + randomX;
      const y = randomY * GALAXY_Y_FLATTEN;
      const z = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      const idx = i * 3;
      galaxyPositions[idx] = x;
      galaxyPositions[idx + 1] = y;
      galaxyPositions[idx + 2] = z;

      const mixedColor = galaxyInnerColor.clone().lerp(galaxyOuterColor, radius / GALAXY_COLOR_LERP);
      galaxyColors[idx] = mixedColor.r;
      galaxyColors[idx + 1] = mixedColor.g;
      galaxyColors[idx + 2] = mixedColor.b;
    }

    galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
    galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(galaxyColors, 3));

    const galaxyMaterial = new THREE.PointsMaterial({
      size: 0.12,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
    });

    const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxy.rotation.x = -0.12;
    galaxy.rotation.y = 0.08;
    scene.add(galaxy);

    const planetGroup = new THREE.Group();
    const planetConfigs = [
      { size: 0.55, distance: 4.2, speed: 0.5, color: '#8fd2ff', emissive: '#2dd4bf', ring: false },
      { size: 0.8, distance: 6.5, speed: 0.32, color: '#a855f7', emissive: '#7c3aed', ring: true },
      { size: 0.38, distance: 3.1, speed: 0.78, color: '#f59e0b', emissive: '#fbbf24', ring: false },
      { size: 0.96, distance: 8.2, speed: 0.22, color: '#38bdf8', emissive: '#0ea5e9', ring: false },
    ];

    const planetMeshes: { mesh: THREE.Mesh; ring?: THREE.Mesh; speed: number; distance: number; offset: number }[] = [];

    planetConfigs.forEach((planet, index) => {
      const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: planet.color,
        emissive: planet.emissive,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.05,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(planet.distance, 0, 0);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      planetGroup.add(mesh);

      let ring: THREE.Mesh | undefined;
      if (planet.ring) {
        const ringGeometry = new THREE.TorusGeometry(planet.size * 1.8, planet.size * 0.18, 16, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: planet.emissive,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.2;
        mesh.add(ring);
      }

      planetMeshes.push({
        mesh,
        ring,
        speed: planet.speed,
        distance: planet.distance,
        offset: index * Math.PI * 0.42,
      });
    });

    scene.add(planetGroup);

    type ShootingStar = {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
    };

    const shootingStars: ShootingStar[] = [];
    const shootingStarGeometry = new THREE.ConeGeometry(0.08, 1.4, 6);
    const shootingStarMaterial = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.95,
    });

    const resetShootingStar = (star: ShootingStar) => {
      const startX = (Math.random() - 0.5) * SHOOTING_STAR_SPAWN_X;
      const startY = Math.random() * SHOOTING_STAR_SPAWN_Y + SHOOTING_STAR_SPAWN_Y_BASE;
      const startZ = SHOOTING_STAR_SPAWN_Z - Math.random() * SHOOTING_STAR_SPAWN_Z_VARIANCE;
      star.mesh.position.set(startX, startY, startZ);
      star.velocity.set(
        SHOOTING_STAR_VELOCITY_X + Math.random() * SHOOTING_STAR_VELOCITY_X_VARIANCE,
        -(SHOOTING_STAR_VELOCITY_Y + Math.random() * SHOOTING_STAR_VELOCITY_Y_VARIANCE),
        SHOOTING_STAR_VELOCITY_Z + Math.random() * SHOOTING_STAR_VELOCITY_Z_VARIANCE
      );
      star.life = SHOOTING_STAR_MIN_LIFE + Math.random() * SHOOTING_STAR_LIFE_VARIANCE;
      (star.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
    };

    const createShootingStar = () => {
      const mesh = new THREE.Mesh(shootingStarGeometry, shootingStarMaterial.clone());
      mesh.rotation.z = -Math.PI / 3.5;
      mesh.rotation.y = Math.PI / 8;
      const star: ShootingStar = {
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
      };
      resetShootingStar(star);
      shootingStars.push(star);
      scene.add(mesh);
    };

    for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
      createShootingStar();
    }

    const ambientColor = new THREE.Color(cyan500 || '#6edff6').getHex();
    const ambient = new THREE.AmbientLight(ambientColor, 0.55);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(6, 8, 10);
    scene.add(directional);

    let targetX = 0;
    let targetY = 0;
    let animationFrameId = 0;
    let bounds = container.getBoundingClientRect();

    const handlePointerMove = (event: PointerEvent) => {
      targetX = (event.clientX - bounds.left) / bounds.width - 0.5;
      targetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    };

    const handleResize = () => {
      bounds = container.getBoundingClientRect();
      const width = container.clientWidth || DEFAULT_WIDTH;
      const height = container.clientHeight || DEFAULT_HEIGHT;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < starCount; i++) {
        const idx = i * 3;
        const baseX = basePositions[idx];
        const baseY = basePositions[idx + 1];
        const baseZ = basePositions[idx + 2];
        const drift = Math.sin(elapsed * 0.6 + speeds[i]) * 0.6;

        pos[idx] = baseX + Math.sin(elapsed * 0.6 + i) * 0.3;
        pos[idx + 1] = baseY + Math.cos(elapsed * 0.75 + speeds[i]) * 0.35;
        pos[idx + 2] = baseZ + drift;
      }

      geometry.attributes.position.needsUpdate = true;

      points.rotation.y += 0.0009;
      points.rotation.x += 0.0006;

      galaxy.rotation.z += 0.0004;
      galaxy.rotation.y += 0.00025;

      planetMeshes.forEach((planet, index) => {
        const angle = elapsed * planet.speed + planet.offset;
        const wobble = Math.sin(elapsed * 0.6 + index) * 0.18;
        planet.mesh.position.set(
          Math.cos(angle) * planet.distance,
          wobble * 0.6,
          Math.sin(angle) * planet.distance
        );
        planet.mesh.rotation.y += 0.01;
        planet.mesh.rotation.x += 0.002;
        if (planet.ring) {
          planet.ring.rotation.z = angle * 0.5;
        }
      });

      shootingStars.forEach((star) => {
        star.life -= delta;
        star.mesh.position.addScaledVector(star.velocity, delta);
        (star.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.min(1, star.life / SHOOTING_STAR_FADE_DURATION));
        if (star.life <= 0 || star.mesh.position.length() > 40) {
          resetShootingStar(star);
        }
      });

      camera.position.x += (targetX * 4 - camera.position.x) * 0.04;
      camera.position.y += (-targetY * 2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    handleResize();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      galaxyGeometry.dispose();
      galaxyMaterial.dispose();
      planetMeshes.forEach((planet) => {
        planet.mesh.geometry.dispose();
        (planet.mesh.material as THREE.Material).dispose();
        if (planet.ring) {
          planet.ring.geometry.dispose();
          (planet.ring.material as THREE.Material).dispose();
        }
      });
      shootingStars.forEach((star) => {
        (star.mesh.material as THREE.Material).dispose();
      });
      shootingStarGeometry.dispose();
      scene.remove(points);
      scene.remove(galaxy);
      scene.remove(ambient);
      scene.remove(directional);
      scene.remove(planetGroup);
      shootingStars.forEach((star) => scene.remove(star.mesh));
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [shouldReduceMotion, blue500, cyan500, purple500]);

  return (
    <Box className="hero-background" aria-hidden="true">
      <MotionBox
        className="hero-gradient"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {!shouldReduceMotion && <Box ref={containerRef} className="hero-canvas-layer" />}
      {shouldReduceMotion && (
        <Box className="hero-fallback-gradient" />
      )}
    </Box>
  );
};

export default HeroBackground;
