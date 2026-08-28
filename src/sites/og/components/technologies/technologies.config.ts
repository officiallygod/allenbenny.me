import type { Variants } from 'framer-motion';
import type { Technology } from '../../../../shared/constants/profileData';

export interface CategoryStyle {
  color: string;
  gradient: string;
  emoji: string;
}

/** Per-category colors / icons used by the Technologies section. */
export const CATEGORY_CONFIG: Record<string, CategoryStyle> = {
  Language: { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', emoji: '💻' },
  Framework: { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', emoji: '🚀' },
  Tool: { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', emoji: '🛠️' },
  Cloud: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', emoji: '☁️' },
  AI: { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', emoji: '🤖' },
};

export const FALLBACK_CATEGORY: CategoryStyle = {
  color: '#64748b',
  gradient: 'linear-gradient(135deg, #64748b, #475569)',
  emoji: '📦',
};

export const getCategoryStyle = (category: string): CategoryStyle =>
  CATEGORY_CONFIG[category] ?? FALLBACK_CATEGORY;

/** Groups a flat technology list into a category → items map (sorted by key). */
export const groupByCategory = (technologies: Technology[]): Record<string, Technology[]> => {
  const grouped: Record<string, Technology[]> = {};
  technologies.forEach((tech) => {
    const category = tech.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(tech);
  });
  return grouped;
};

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const categoryVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 150, damping: 20 },
  },
};

export const tagVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, x: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    x: 10,
    transition: { duration: 0.2 },
  },
};
