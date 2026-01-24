import React, { createContext, useContext } from 'react';
import { profileData, ProfileData, Project } from '../constants/profileData';
import { Language } from '../types/language';
import { useLanguage } from './LanguageContext';

const ProfileContext = createContext<ProfileData>(profileData.en);

const hasLink = (project: Project): project is Project & { link: string } =>
  typeof project.link === 'string' && project.link.length > 0;

const projectKey = (project: Project) =>
  hasLink(project) ? project.link : `${project.title}-${project.date}`;

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

  const localizedByKey = new Map(
    localizedProjects.map((project) => [projectKey(project), project])
  );
  const usedKeys = new Set<string>();

  const mergedProjects = fallbackProjects.map((project) => {
    const key = projectKey(project);
    const localized = localizedByKey.get(key);
    if (localized) {
      usedKeys.add(key);
      return localized;
    }

    return project;
  });

  const remainingLocalized = localizedProjects.filter(
    (project) => !usedKeys.has(projectKey(project))
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
