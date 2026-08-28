import React, { useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { useProfile } from '../../../shared/contexts/ProfileContext';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import '../styles/Technologies.css';
import { groupByCategory } from './technologies/technologies.config';
import TechCategoryList from './technologies/TechCategoryList';
import TechTagPanel from './technologies/TechTagPanel';

const Technologies: React.FC = () => {
  const { technologies } = useProfile();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>('Language');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const categorizedTech = useMemo(() => groupByCategory(technologies), [technologies]);
  const categories = Object.keys(categorizedTech).sort();

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  return (
    <m.section
      className="technologies"
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
        {t.sections.technologies}
      </m.h2>

      <div className="tech-container">
        <TechCategoryList
          categories={categories}
          grouped={categorizedTech}
          selectedCategory={selectedCategory}
          hoveredCategory={hoveredCategory}
          onSelect={handleCategoryClick}
          onHover={setHoveredCategory}
        />
        <TechTagPanel
          selectedCategory={selectedCategory}
          grouped={categorizedTech}
          placeholder={t.sections.technologiesPlaceholder}
        />
      </div>
    </m.section>
  );
};

export default React.memo(Technologies);
