import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../redux/hooks';
import '../styles/About.css';

const About: React.FC = () => {
  const { bio } = useAppSelector((state) => state.profile);

  return (
    <motion.section
      className="about"
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
        About Me
      </motion.h2>
      <div className="about-content">
        {bio.map((paragraph, index) => (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
          >
            {paragraph}
          </motion.p>
        ))}
      </div>
      <motion.div
        className="about-decoration"
        initial={{ width: 0 }}
        whileInView={{ width: '100px' }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
    </motion.section>
  );
};

export default React.memo(About);
