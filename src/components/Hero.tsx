import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import { useResume } from '../contexts/ResumeContext';
import { useTheme } from '../contexts/ThemeContext';
import SocialIcon from './SocialIcon';
import '../styles/Hero.css';
import OptimizedBackground from './OptimizedBackground';

const Hero: React.FC = () => {
  const { name, title, tagline, socialLinks } = useProfile();
  const { openResume } = useResume();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const toggleLabel = isDarkMode ? 'Light mode' : 'Dark mode';
  const toggleIcon = isDarkMode ? '☀️' : '🌙';

  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <OptimizedBackground />

      <motion.button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        aria-pressed={isDarkMode}
      >
        <span className="theme-toggle-icon">{toggleIcon}</span>
        <span>{toggleLabel}</span>
      </motion.button>
      
      <div className="hero-content-wrapper">
        {/* Left side - Main content */}
        <motion.div
          className="hero-main"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1 
            className="hero-name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {name}
          </motion.h1>
          <motion.h2
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {title}
          </motion.h2>
          <motion.p
            className="hero-tagline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {tagline}
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.a
              href="#contact"
              className="cta-button primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get In Touch
            </motion.a>
            <motion.a
              href="#projects"
              className="cta-button secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Projects
            </motion.a>
            <motion.button
              onClick={openResume}
              className="cta-button secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Open resume in modal window"
            >
              View Resume
            </motion.button>
          </motion.div>

          <motion.div
            className="social-links"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            {socialLinks.map((link, index) => (
              <motion.a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <SocialIcon type={link.icon} className="social-icon" />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>

        {/* Right side - Stats/Features */}
        <motion.div
          className="hero-side"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.div 
            className="stat-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="stat-icon">💼</div>
            <div className="stat-label">Experience</div>
            <div className="stat-value">Professional</div>
          </motion.div>
          <motion.div 
            className="stat-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="stat-icon">🚀</div>
            <div className="stat-label">Projects</div>
            <div className="stat-value">Multiple</div>
          </motion.div>
          <motion.div 
            className="stat-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="stat-icon">⚡</div>
            <div className="stat-label">Focus</div>
            <div className="stat-value">Innovation</div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default React.memo(Hero);
