import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Technologies.css';

// Category configuration with colors and icons
const CATEGORY_CONFIG: Record<string, { color: string; gradient: string; emoji: string }> = {
  Language: { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', emoji: '💻' },
  Sprache: { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', emoji: '💻' }, // German translation
  Framework: { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', emoji: '🚀' },
  Tool: { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', emoji: '🛠️' },
  Cloud: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', emoji: '☁️' },
  AI: { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', emoji: '🤖' },
};

const Technologies: React.FC = () => {
  const { technologies } = useProfile();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Group technologies by category
  const categorizedTech = useMemo(() => {
    const grouped: Record<string, typeof technologies> = {};
    technologies.forEach(tech => {
      const category = tech.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tech);
    });
    return grouped;
  }, [technologies]);

  const categories = Object.keys(categorizedTech).sort();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const categoryVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 150,
        damping: 20,
      },
    },
  };

  const tagVariants = {
    hidden: { opacity: 0, scale: 0.8, x: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      x: 10,
      transition: { duration: 0.2 },
    },
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || { color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)', emoji: '📦' };
  };

  return (
    <motion.section
      className="technologies"
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
        {t.sections.technologies}
      </motion.h2>

      <motion.div
        className="tech-categories"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {categories.map((category) => {
          const config = getCategoryConfig(category);
          const isSelected = selectedCategory === category;
          const isHovered = hoveredCategory === category;
          const shouldShowTags = selectedCategory === null || isSelected;

          return (
            <motion.div
              key={category}
              className={`category-section ${isSelected ? 'selected' : ''}`}
              variants={categoryVariants}
              onHoverStart={() => setHoveredCategory(category)}
              onHoverEnd={() => setHoveredCategory(null)}
            >
              <motion.div
                className="category-header"
                onClick={() => handleCategoryClick(category)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: isSelected || isHovered ? config.gradient : 'var(--bg-surface, #ffffff)',
                  color: isSelected || isHovered ? '#ffffff' : 'var(--text-primary, #334155)',
                  borderColor: config.color,
                }}
              >
                <span className="category-emoji">{config.emoji}</span>
                <span className="category-name">{category}</span>
                <span className="category-count">{categorizedTech[category].length}</span>
                <motion.span
                  className="category-arrow"
                  animate={{ rotate: isSelected ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.span>
              </motion.div>

              <AnimatePresence>
                {shouldShowTags && (
                  <motion.div
                    className="tech-tags"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={containerVariants}
                  >
                    {categorizedTech[category].map((tech) => (
                      <motion.div
                        key={`${category}-${tech.name}`}
                        className="tag-wrapper"
                        variants={tagVariants}
                        layout
                      >
                        <motion.span
                          className="tag"
                          style={{
                            borderColor: config.color,
                          }}
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
                          <motion.div
                            className="tag-glow"
                            style={{ background: `radial-gradient(circle, ${config.color}40 0%, transparent 70%)` }}
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                          />
                        </motion.span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.section>
  );
};

export default React.memo(Technologies);
