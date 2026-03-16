import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import { useResume } from '../contexts/ResumeContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import SocialIcon from './SocialIcon';
import '../styles/Hero.css';
import OptimizedBackground from './OptimizedBackground';

const Hero: React.FC = () => {
  const { name, tagline, socialLinks } = useProfile();
  const { openResume } = useResume();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const toggleLabel = isDarkMode ? 'Light mode' : 'Dark mode';
  const toggleIcon = isDarkMode ? '☀️' : '🌙';
  const { language, toggleLanguage, t } = useLanguage();
  const languageFlag = language === 'en' ? '🇬🇧' : '🇩🇪';
  const currentLanguage = language === 'en' ? t.languageToggle.english : t.languageToggle.german;
  const chips = [t.hero.chip1, t.hero.chip2, t.hero.chip3];

  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <OptimizedBackground />

      {/* Controls */}
      <div className="hero-controls">
        <motion.button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          aria-pressed={isDarkMode}
        >
          <span className="theme-toggle-icon">{toggleIcon}</span>
          <span>{toggleLabel}</span>
        </motion.button>
        <motion.button
          type="button"
          className="language-toggle"
          onClick={toggleLanguage}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          aria-label={`${t.languageToggle.label}: ${currentLanguage}`}
          title={`${t.languageToggle.label}: ${currentLanguage}`}
        >
          <span className="language-flag" aria-hidden="true">{languageFlag}</span>
        </motion.button>
      </div>

      {/* Content */}
      <div className="hero-content-wrapper">

        {/* Left – main content */}
        <motion.div
          className="hero-main"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {/* Availability badge */}
          <motion.div
            className="hero-availability"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="availability-dot" aria-hidden="true" />
            {t.hero.availability}
          </motion.div>

          {/* Name */}
          <motion.h1
            className="hero-name"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3 }}
          >
            {name}
          </motion.h1>

          {/* Role chips */}
          <motion.div
            className="hero-chips"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4 }}
          >
            {chips.map((chip) => (
              <span key={chip} className="hero-chip">{chip}</span>
            ))}
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="hero-tagline"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5 }}
          >
            {tagline}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6 }}
          >
            <motion.a
              href="#contact"
              className="cta-button primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t.hero.ctaPrimary}
            </motion.a>
            <motion.a
              href="#projects"
              className="cta-button secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t.hero.ctaSecondary}
            </motion.a>
            <motion.button
              onClick={openResume}
              className="cta-button secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label={t.hero.ctaResume}
            >
              {t.hero.ctaResume}
            </motion.button>
          </motion.div>

          {/* Social links */}
          <motion.div
            className="social-links"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + index * 0.08 }}
                aria-label={link.name}
              >
                <SocialIcon type={link.icon} className="social-icon" />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>

        {/* Right – stat cards */}
        <motion.div
          className="hero-side"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          {[
            { icon: '💼', label: t.hero.statExperience, value: t.hero.statExperienceValue },
            { icon: '🚀', label: t.hero.statProjects,   value: t.hero.statProjectsValue   },
            { icon: '⚡', label: t.hero.statFocus,      value: t.hero.statFocusValue      },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="stat-card"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ transitionDelay: `${0.45 + i * 0.1}s` } as React.CSSProperties}
            >
              <div className="stat-icon" aria-hidden="true">{stat.icon}</div>
              <div className="stat-info">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll" aria-hidden="true">
        <span className="hero-scroll-text">Scroll</span>
        <div className="hero-scroll-line" />
      </div>
    </motion.section>
  );
};

export default React.memo(Hero);

