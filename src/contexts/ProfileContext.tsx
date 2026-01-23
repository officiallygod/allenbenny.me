import React, { createContext, useContext } from 'react';
import { profileData, ProfileData } from '../constants/profileData';
import { useLanguage } from './LanguageContext';

const ProfileContext = createContext<ProfileData>(profileData.en);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  return (
    <ProfileContext.Provider value={profileData[language]}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  return useContext(ProfileContext);
};
