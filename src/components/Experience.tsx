import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Experience.css';

const Experience: React.FC = () => {
  const { experience, education } = useProfile();
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <section id="experience" className="experience-section">
      <motion.div
        className="experience-container"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {t.sections.experience}
        </motion.h2>

        <div className="experience-grid">
          <motion.div className="experience-column" variants={itemVariants}>
            <h3 className="column-title">{t.sections.education}</h3>
            {education.map((edu, index) => (
              <motion.div
                key={index}
                className="experience-card education-card"
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-header">
                  <h4 className="company">{edu.institution}</h4>
                  <span className="duration">{edu.duration}</span>
                </div>
                <h5 className="role">{edu.degree}</h5>
                <motion.div
                  className="card-accent"
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="experience-column" variants={itemVariants}>
            <h3 className="column-title">{t.sections.professionalExperience}</h3>
            {experience.map((exp, index) => (
              <motion.div
                key={index}
                className="experience-card"
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-header">
                  <h4 className="company">{exp.company}</h4>
                  <span className="duration">{exp.duration}</span>
                </div>
                <h5 className="role">{exp.role}</h5>
                <p className="description">{exp.description}</p>
                <motion.div
                  className="card-accent"
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Experience;
