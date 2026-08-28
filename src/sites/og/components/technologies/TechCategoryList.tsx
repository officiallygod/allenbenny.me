import React from 'react';
import { m } from 'framer-motion';
import type { Technology } from '../../../../shared/constants/profileData';
import {
  categoryVariants,
  containerVariants,
  getCategoryStyle,
} from './technologies.config';

interface TechCategoryListProps {
  categories: string[];
  grouped: Record<string, Technology[]>;
  selectedCategory: string | null;
  hoveredCategory: string | null;
  onSelect: (category: string) => void;
  onHover: (category: string | null) => void;
}

const TechCategoryList: React.FC<TechCategoryListProps> = ({
  categories,
  grouped,
  selectedCategory,
  hoveredCategory,
  onSelect,
  onHover,
}) => (
  <m.div
    className="tech-categories-sidebar"
    variants={containerVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.1 }}
  >
    {categories.map((category) => {
      const config = getCategoryStyle(category);
      const isSelected = selectedCategory === category;
      const isHovered = hoveredCategory === category;

      return (
        <m.div
          key={category}
          className={`category-item ${isSelected ? 'selected' : ''}`}
          variants={categoryVariants}
          onHoverStart={() => onHover(category)}
          onHoverEnd={() => onHover(null)}
          onClick={() => onSelect(category)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: isSelected || isHovered ? config.gradient : 'var(--surface)',
            color: isSelected || isHovered ? '#ffffff' : 'var(--text)',
            borderColor: config.color,
          }}
        >
          <span className="category-emoji">{config.emoji}</span>
          <span className="category-name">{category}</span>
          <span className="category-count">{grouped[category].length}</span>
        </m.div>
      );
    })}
  </m.div>
);

export default TechCategoryList;
