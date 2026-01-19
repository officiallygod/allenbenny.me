import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppSelector } from '../redux/hooks';
import SocialIcon from './SocialIcon';
import '../styles/Hero.css';
import HeroBackground from './HeroBackground';

const Hero: React.FC = () => {
  const { name, title, tagline, socialLinks } = useAppSelector((state) => state.profile);
  const shouldReduceMotion = useReducedMotion();

  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    }),
  };

  const nameLetters = name.split('');

  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <HeroBackground />
      <motion.div
        className="hero-content"
        animate={
          shouldReduceMotion
            ? { y: 0, rotateX: 0, rotateY: 0 }
            : { y: [0, -6, 0], rotateX: [0, 1.2, 0], rotateY: [0, -1.2, 0] }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 12, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <motion.div
          className="hero-text"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1 className="hero-name">
            {nameLetters.map((letter, index) => (
              <motion.span
                key={index}
                custom={index}
                variants={letterVariants}
                initial="hidden"
                animate="visible"
                className="letter"
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </motion.h1>
          <motion.h2
            className="hero-title"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {title}
          </motion.h2>
          <motion.p
            className="hero-tagline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            {tagline}
          </motion.p>
        </motion.div>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <motion.a
            href="#contact"
            className="cta-button primary"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Get In Touch
          </motion.a>
          <motion.a
            href="#experience"
            className="cta-button secondary"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            View Experience
          </motion.a>
        </motion.div>

        <motion.div
          className="social-links"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          {socialLinks.map((link, index) => (
            <motion.a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`social-link ${link.icon}`}
              whileHover={{ scale: 1.08, rotate: 2 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5 + index * 0.1, type: 'spring', stiffness: 200 }}
            >
              <SocialIcon type={link.icon} className="social-icon" />
            </motion.a>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

export default Hero;
