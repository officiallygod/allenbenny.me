import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { LanguageProvider } from './shared/contexts/LanguageContext';
import { ProfileProvider } from './shared/contexts/ProfileContext';
import { ResumeProvider } from './shared/contexts/ResumeContext';
import { ThemeProvider } from './shared/contexts/ThemeContext';
import App from './App';
import './sites/og/styles/global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
      <ChakraProvider value={defaultSystem}>
        <ThemeProvider>
          <LanguageProvider>
            <ProfileProvider>
              <ResumeProvider>
                <App />
              </ResumeProvider>
            </ProfileProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ChakraProvider>
    </React.StrictMode>
);
