import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../constants/translations';
import { Language } from '../types/language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const DEFAULT_LANGUAGE: Language = 'en';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'de' : 'en'));
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: translations[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
