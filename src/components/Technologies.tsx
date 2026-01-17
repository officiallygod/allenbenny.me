import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../redux/hooks';
import '../styles/Technologies.css';

const Technologies: React.FC = () => {
  const { technologies } = useAppSelector((state) => state.profile);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.7,
      },
    },
  };

  const tagVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.section
      className="technologies"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
    >
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        Technologies
      </motion.h2>
      <motion.div
        className="tech-tags"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {technologies.map((tech, index) => (
          <motion.span
            key={index}
            className="tag"
            variants={tagVariants}
            whileHover={{
              scale: 1.1,
              rotate: [0, -5, 5, -5, 0],
              transition: { duration: 0.3 },
            }}
            whileTap={{ scale: 0.95 }}
          >
            {tech.name}
          </motion.span>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default Technologies;
