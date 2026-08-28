import React from 'react';
import { m } from 'framer-motion';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { useLanguage } from '../../../../shared/contexts/LanguageContext';

const HeroControls: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const isDarkMode = theme === 'dark';
  const toggleLabel = isDarkMode ? 'Light mode' : 'Dark mode';
  const toggleIcon = isDarkMode ? '☀️' : '🌙';
  const languageFlag = language === 'en' ? '🇬🇧' : '🇩🇪';
  const currentLanguage = language === 'en' ? t.languageToggle.english : t.languageToggle.german;

  return (
    <div className="hero-controls">
      <m.button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        aria-pressed={isDarkMode}
      >
        <span className="theme-toggle-icon">{toggleIcon}</span>
        <span>{toggleLabel}</span>
      </m.button>
      <m.button
        type="button"
        className="language-toggle"
        onClick={toggleLanguage}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label={`${t.languageToggle.label}: ${currentLanguage}`}
        title={`${t.languageToggle.label}: ${currentLanguage}`}
      >
        <span className="language-flag" aria-hidden="true">{languageFlag}</span>
      </m.button>
    </div>
  );
};

export default HeroControls;
