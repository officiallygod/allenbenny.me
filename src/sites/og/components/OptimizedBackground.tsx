import React, { useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import '../styles/OptimizedBackground.css';

/**
 * Lightweight CSS-based background animation
 * Replaces heavy Three.js and Framer Motion with pure CSS GPU compositing
 */
const PARTICLE_COUNT = 30;
const OptimizedBackground: React.FC = () => {
  const particleConfig = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 10}s`,
        animationDuration: `${15 + Math.random() * 10}s`,
      })),
    []
  );

  return (
    <Box className="optimized-background" aria-hidden="true">
      {/* Animated gradient background running purely on GPU */}
      <Box className="gradient-orb gradient-orb-1" />
      <Box className="gradient-orb gradient-orb-2" />
      <Box className="gradient-orb gradient-orb-3" />
      
      {/* Minimal decorative particles (CSS-only) */}
      <div className="css-particles">
        {particleConfig.map((style, i) => (
          <div 
            key={i} 
            className="particle" 
            style={style}
          />
        ))}
      </div>
      
      {/* Grid pattern overlay */}
      <div className="grid-pattern" />
    </Box>
  );
};

export default React.memo(OptimizedBackground);
