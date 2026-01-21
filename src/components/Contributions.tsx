import React from 'react';
import { motion } from 'framer-motion';
import '../styles/Contributions.css';

const Contributions: React.FC = () => {
  const graphUrl =
    'https://github-contributions-api.jogruber.de/v4/officiallygod?from=2022-01-01';

  return (
    <motion.section
      className="contributions"
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
        GitHub Contributions
      </motion.h2>

      <motion.div
        className="contributions-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <div className="contributions-meta">
          <p className="contributions-subtitle">
            Showing all contributions since 2022 in a clean, on-brand chart.
          </p>
          <a
            href="https://github.com/officiallygod"
            target="_blank"
            rel="noopener noreferrer"
            className="contributions-link"
          >
            View full profile
          </a>
        </div>
        <div className="contributions-graph">
          <img
            src={graphUrl}
            alt="GitHub contributions graph since 2022 for officiallygod"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.classList.add('is-hidden');
              const fallback = target.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.classList.add('is-visible');
            }}
          />
          <div className="contributions-fallback" aria-hidden="true">
            <span>Unable to load contributions graph.</span>
            <a
              href="https://github.com/officiallygod"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit GitHub profile
            </a>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
};

export default Contributions;
