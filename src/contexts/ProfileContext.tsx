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

  const localizedByLink = new Map(
    localizedProjects
      .filter((project) => project.link)
      .map((project) => [project.link as string, project])
  );
  const localizedWithoutLink = localizedProjects.filter((project) => !project.link);
  const fallbackLinks = new Set(
    fallbackProjects.filter((project) => project.link).map((project) => project.link as string)
  );
  let noLinkIndex = 0;

  const mergedProjects = fallbackProjects.map((project) => {
    if (project.link) {
      return localizedByLink.get(project.link) ?? project;
    }

    const localized = localizedWithoutLink[noLinkIndex];
    if (localized) {
      noLinkIndex += 1;
      return localized;
    }

    return project;
  });

  const extraLinkedProjects = localizedProjects.filter(
    (project) => project.link && !fallbackLinks.has(project.link)
  );

  return [...mergedProjects, ...extraLinkedProjects, ...localizedWithoutLink.slice(noLinkIndex)];
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
