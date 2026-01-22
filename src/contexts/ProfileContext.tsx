import React, { createContext, useContext } from 'react';
import { profileData, ProfileData } from '../constants/profileData';

const ProfileContext = createContext<ProfileData>(profileData);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProfileContext.Provider value={profileData}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  return useContext(ProfileContext);
};
