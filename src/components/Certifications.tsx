import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Certifications.css';

const Certifications: React.FC = () => {
  const { certifications } = useProfile();
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <section id="certifications" className="certifications-section">
      <motion.div
        className="certifications-container"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t.sections.certifications}
        </motion.h2>

        <div className="certifications-grid">
          {certifications.map((cert) => {
            const CardWrapper = cert.link ? motion.a : motion.div;
            const cardProps = cert.link
              ? {
                  href: cert.link,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'certification-card certification-card-link',
                }
              : { className: 'certification-card' };

            return (
              <CardWrapper
                key={`${cert.title}-${cert.issuer}`}
                {...cardProps}
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="cert-content">
                  <h3 className="cert-title">{cert.title}</h3>
                  <p className="cert-issuer">{cert.issuer}</p>
                  <span className="cert-date">{cert.date}</span>
                </div>
                <motion.div
                  className="cert-accent"
                  initial={{ height: 0 }}
                  whileInView={{ height: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </CardWrapper>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default Certifications;
