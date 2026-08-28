import React from 'react';
import { m } from 'framer-motion';
import { useProfile } from '../../../shared/contexts/ProfileContext';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import '../styles/About.css';

const About: React.FC = () => {
  const { bio } = useProfile();
  const { t } = useLanguage();

  return (
    <m.section
      className="about"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8 }}
    >
      <m.h2
        className="section-title"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {t.sections.about}
      </m.h2>
      <div className="about-content">
        {bio.map((paragraph, index) => (
          <m.p
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
          >
            {paragraph}
          </m.p>
        ))}
      </div>
      <m.div
        className="about-decoration"
        initial={{ width: 0 }}
        whileInView={{ width: '100px' }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
    </m.section>
  );
};

export default React.memo(About);
