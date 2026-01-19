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

    const ambientColor = new THREE.Color(cyan500 || '#6edff6').getHex();
    const ambient = new THREE.AmbientLight(ambientColor, 0.45);
    scene.add(ambient);

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
      scene.remove(points);
      scene.remove(ambient);
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
