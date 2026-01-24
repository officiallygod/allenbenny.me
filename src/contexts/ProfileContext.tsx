import React, { createContext, useContext } from 'react';
import { profileData, ProfileData } from '../constants/profileData';
import { Language } from '../types/language';
import { useLanguage } from './LanguageContext';

const ProfileContext = createContext<ProfileData>(profileData.en);

const mergeProjects = (language: Language): ProfileData['projects'] => {
  if (language === 'en') {
    return profileData.en.projects;
  }

  const fallbackProjects = profileData.en.projects;
  const localizedProjects = profileData[language].projects;

  if (localizedProjects.length === 0) {
    return fallbackProjects;
  }

  const localizedByTitle = new Map(localizedProjects.map((project) => [project.title, project]));
  const mergedProjects = fallbackProjects.map(
    (project) => localizedByTitle.get(project.title) ?? project
  );
  const fallbackTitles = new Set(fallbackProjects.map((project) => project.title));

  for (const project of localizedProjects) {
    if (!fallbackTitles.has(project.title)) {
      mergedProjects.push(project);
    }
  }

  return mergedProjects;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const languageProfile = profileData[language];
  const projects = mergeProjects(language);

  return (
    <ProfileContext.Provider value={{ ...languageProfile, projects }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  return useContext(ProfileContext);
};
