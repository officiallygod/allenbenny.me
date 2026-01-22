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
        staggerChildren: 0.08,
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
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8 }}
    >
      <motion.h2
        className="section-title"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Tech Stack
      </motion.h2>
      <motion.div
        className="tech-tags"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {technologies.map((tech, index) => (
          <motion.div
            key={index}
            className="tag-wrapper"
            variants={tagVariants}
          >
            <motion.span
              className="tag"
              whileHover={{
                scale: 1.15,
                y: -5,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.95 }}
            >
              {tech.name}
              <motion.div
                className="tag-glow"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              />
            </motion.span>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default React.memo(Technologies);
