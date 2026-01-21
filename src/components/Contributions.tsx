import React from 'react';
import { motion } from 'framer-motion';
import '../styles/Contributions.css';

const Contributions: React.FC = () => {
  const githubUsername = 'officiallygod';
  const githubProfileUrl = `https://github.com/${githubUsername}`;
  const graphUrl = `https://github-contributions-api.jogruber.de/v4/${githubUsername}`;
  const [hasError, setHasError] = React.useState(false);

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
            Showing the complete GitHub contribution history in a clean, on-brand chart.
          </p>
          <a
            href={githubProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="contributions-link"
          >
            View full profile
          </a>
        </div>
        <div className="contributions-graph">
          {!hasError && (
            <img
              src={graphUrl}
              alt={`GitHub contributions graph for ${githubUsername}`}
              loading="lazy"
              onError={() => setHasError(true)}
            />
          )}
          <div
            className={`contributions-fallback ${hasError ? 'is-visible' : ''}`}
            aria-hidden="true"
          >
            <span>Unable to load contributions graph.</span>
            <a
              href={githubProfileUrl}
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
