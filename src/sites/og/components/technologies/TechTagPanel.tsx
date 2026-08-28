import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Technology } from '../../../../shared/constants/profileData';
import { containerVariants, tagVariants, getCategoryStyle } from './technologies.config';

interface TechTagPanelProps {
  selectedCategory: string | null;
  grouped: Record<string, Technology[]>;
  placeholder: string;
}

const TechTagPanel: React.FC<TechTagPanelProps> = ({
  selectedCategory,
  grouped,
  placeholder,
}) => (
  <m.div className="tech-values-panel">
    <AnimatePresence mode="wait">
      {selectedCategory ? (
        <m.div
          key={selectedCategory}
          className="tech-tags"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={containerVariants}
        >
          {grouped[selectedCategory].map((tech) => {
            const config = getCategoryStyle(selectedCategory);
            return (
              <m.div key={`${selectedCategory}-${tech.name}`} className="tag-wrapper" variants={tagVariants} layout>
                <m.span
                  className="tag"
                  style={{ borderColor: config.color }}
                  whileHover={{
                    scale: 1.15,
                    y: -5,
                    background: config.gradient,
                    color: '#ffffff',
                    borderColor: 'transparent',
                    boxShadow: `0 8px 30px ${config.color}55`,
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tech.name}
                  <m.div
                    className="tag-glow"
                    style={{ background: `radial-gradient(circle, ${config.color}40 0%, transparent 70%)` }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  />
                </m.span>
              </m.div>
            );
          })}
        </m.div>
      ) : (
        <m.div
          key="placeholder"
          className="tech-placeholder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <p>{placeholder}</p>
        </m.div>
      )}
    </AnimatePresence>
  </m.div>
);

export default TechTagPanel;
