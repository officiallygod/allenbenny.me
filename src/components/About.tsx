import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../redux/hooks';
import '../styles/About.css';

const About: React.FC = () => {
  const { bio } = useAppSelector((state) => state.profile);

  return (
    <motion.section
      className="about"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      {bio.map((paragraph, index) => (
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 + index * 0.2 }}
          dangerouslySetInnerHTML={{
            __html: paragraph.replace(
              /(Newfold Digital|Karlsruhe Institute of Technology)/g,
              '<strong>$1</strong>'
            ),
          }}
        />
      ))}
    </motion.section>
  );
};

export default About;
