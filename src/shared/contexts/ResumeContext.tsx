import React, { createContext, useContext, useState } from 'react';

interface ResumeContextType {
  isResumeOpen: boolean;
  openResume: () => void;
  closeResume: () => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export const ResumeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isResumeOpen, setIsResumeOpen] = useState(false);

  const openResume = () => {
    setIsResumeOpen(true);
  };

  const closeResume = () => {
    setIsResumeOpen(false);
  };

  return (
    <ResumeContext.Provider value={{ isResumeOpen, openResume, closeResume }}>
      {children}
    </ResumeContext.Provider>
  );
};

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};
