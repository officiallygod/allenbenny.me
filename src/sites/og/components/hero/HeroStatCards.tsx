import React from 'react';
import { m } from 'framer-motion';
import { itemVariants } from './hero.variants';

interface HeroStatCardsProps {
  stats: { icon: string; label: string; value: string }[];
}

const HeroStatCards: React.FC<HeroStatCardsProps> = ({ stats }) => (
  <m.div className="hero-side" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="visible">
    {stats.map((stat) => (
      <m.div
        key={stat.label}
        className="stat-card"
        variants={itemVariants}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <div className="stat-icon" aria-hidden="true">{stat.icon}</div>
        <div className="stat-info">
          <div className="stat-label">{stat.label}</div>
          <div className="stat-value">{stat.value}</div>
        </div>
      </m.div>
    ))}
  </m.div>
);

export default HeroStatCards;
