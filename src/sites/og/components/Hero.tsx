import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { useProfile } from '../../../shared/contexts/ProfileContext';
import { useResume } from '../../../shared/contexts/ResumeContext';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import OptimizedBackground from './OptimizedBackground';
import '../styles/Hero.css';
import { containerVariants, leftItemVariants, itemVariants, HERO_STATS } from './hero/hero.variants';
import HeroControls from './hero/HeroControls';
import HeroSocialLinks from './hero/HeroSocialLinks';
import HeroStatCards from './hero/HeroStatCards';

const Hero: React.FC = React.memo(() => {
  const { name, tagline, socialLinks } = useProfile();
  const { openResume } = useResume();
  const { t } = useLanguage();

  const chips = useMemo(() => [t.hero.chip1, t.hero.chip2, t.hero.chip3], [t.hero]);
  const stats = useMemo(() => HERO_STATS(t), [t]);

  // Smooth scroll handler for anchor links
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = targetId;
    }
  };

  return (
    <section className="hero">
      <OptimizedBackground />

      <HeroControls />

      {/* Content */}
      <div className="hero-content-wrapper">
        {/* Left - main content */}
        <m.div className="hero-main" variants={containerVariants} initial="hidden" animate="visible">
          <m.div className="hero-availability" variants={leftItemVariants}>
            <span className="availability-dot" aria-hidden="true" />
            {t.hero.availability}
          </m.div>

          <m.h1 className="hero-name" variants={leftItemVariants}>{name}</m.h1>

          <m.div className="hero-chips" variants={leftItemVariants}>
            {chips.map((chip) => (
              <span key={chip} className="hero-chip">{chip}</span>
            ))}
          </m.div>

          <m.p className="hero-tagline" variants={leftItemVariants}>{tagline}</m.p>

          <m.div className="hero-cta" variants={leftItemVariants}>
            <m.a
              href="#contact"
              onClick={(e) => handleSmoothScroll(e, 'contact')}
              className="cta-button primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t.hero.ctaPrimary}
            </m.a>
            <m.a
              href="#projects"
              onClick={(e) => handleSmoothScroll(e, 'projects')}
              className="cta-button secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t.hero.ctaSecondary}
            </m.a>
            <m.button
              onClick={openResume}
              className="cta-button secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label={t.hero.ctaResume}
            >
              {t.hero.ctaResume}
            </m.button>
          </m.div>

          <HeroSocialLinks socialLinks={socialLinks} />
        </m.div>

        {/* Right - stat cards */}
        <HeroStatCards stats={stats} />
      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll" aria-hidden="true">
        <span className="hero-scroll-text">Scroll</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  );
});

export default Hero;
