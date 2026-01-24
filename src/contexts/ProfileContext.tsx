import React, { createContext, useContext } from 'react';
import { profileData, ProfileData } from '../constants/profileData';
import { Language } from '../types/language';
import { useLanguage } from './LanguageContext';

const ProfileContext = createContext<ProfileData>(profileData.en);

const hasLink = (
  project: ProfileData['projects'][number]
): project is ProfileData['projects'][number] & { link: string } =>
  typeof project.link === 'string' && project.link.length > 0;

/**
 * Keeps the project list consistent across languages by preferring localized data
 * where possible and falling back to the English list for missing entries.
 *
 * Rules:
 * - If a localized project shares the same link as an English project, use it.
 * - For projects without links, match by order and fill gaps with English data.
 * - Any extra localized projects are appended once to avoid omissions.
 */
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
    localizedProjects.filter(hasLink).map((project) => [project.link, project])
  );
  const localizedWithoutLink = localizedProjects.filter((project) => !hasLink(project));
  const usedLocalized = new Set<ProfileData['projects'][number]>();
  let noLinkIndex = 0;

  const mergedProjects = fallbackProjects.map((project) => {
    if (project.link) {
      const localized = localizedByLink.get(project.link);
      if (localized) {
        usedLocalized.add(localized);
        return localized;
      }

      return project;
    }

    const localized = localizedWithoutLink[noLinkIndex];
    if (localized) {
      noLinkIndex += 1;
      usedLocalized.add(localized);
      return localized;
    }

    return project;
  });

  const remainingLocalized = localizedProjects.filter(
    (project) => !usedLocalized.has(project)
  );

  return [...mergedProjects, ...remainingLocalized];
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
