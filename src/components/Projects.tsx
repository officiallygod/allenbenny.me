import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Projects.css';

const Projects: React.FC = () => {
  const { projects } = useProfile();
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <section id="projects" className="projects-section">
      <motion.div
        className="projects-container"
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
          {t.sections.projects}
        </motion.h2>

        <div className="projects-grid">
          {projects.map((project, index) => {
            const CardWrapper = project.link ? motion.a : motion.div;
            const cardProps = project.link
              ? {
                  href: project.link,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'project-card project-card-link',
                }
              : { className: 'project-card' };

            return (
              <CardWrapper
                key={project.link || `project-${index}-${project.date}`}
                {...cardProps}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="project-header">
                  <h3 className="project-title">{project.title}</h3>
                  <span className="project-date">{project.date}</span>
                </div>
                <p className="project-description">{project.description}</p>
                <motion.div
                  className="card-accent"
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </CardWrapper>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default Projects;
