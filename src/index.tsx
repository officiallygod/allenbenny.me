import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { ResumeProvider } from './contexts/ResumeContext';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';
import './styles/global.css';

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
