import type { Variants } from 'framer-motion';

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export const leftItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

/** Stat cards shown on the right side of the hero. */
export const HERO_STATS = (t: {
  hero: {
    statExperience: string;
    statExperienceValue: string;
    statProjects: string;
    statProjectsValue: string;
    statFocus: string;
    statFocusValue: string;
  };
}) => [
  { icon: '💼', label: t.hero.statExperience, value: t.hero.statExperienceValue },
  { icon: '🚀', label: t.hero.statProjects, value: t.hero.statProjectsValue },
  { icon: '⚡', label: t.hero.statFocus, value: t.hero.statFocusValue },
];
