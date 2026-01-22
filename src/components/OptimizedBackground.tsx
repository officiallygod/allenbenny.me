import React from 'react';
import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import '../styles/OptimizedBackground.css';

const MotionBox = motion(Box);

/**
 * Lightweight CSS-based background animation
 * Replaces heavy Three.js with performant CSS gradients and minimal particles
 */
const OptimizedBackground: React.FC = () => {
  return (
    <Box className="optimized-background" aria-hidden="true">
      {/* Animated gradient background */}
      <MotionBox
        className="gradient-orb gradient-orb-1"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <MotionBox
        className="gradient-orb gradient-orb-2"
        animate={{
          x: [0, -25, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <MotionBox
        className="gradient-orb gradient-orb-3"
        animate={{
          x: [0, 20, 0],
          y: [0, 25, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Minimal decorative particles (CSS-only) */}
      <div className="css-particles">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i} 
            className="particle" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      
      {/* Grid pattern overlay */}
      <div className="grid-pattern" />
    </Box>
  );
};

export default React.memo(OptimizedBackground);
