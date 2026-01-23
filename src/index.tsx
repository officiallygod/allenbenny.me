import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { ResumeProvider } from './contexts/ResumeContext';
import App from './App';
import './styles/global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <LanguageProvider>
        <ProfileProvider>
          <ResumeProvider>
            <App />
          </ResumeProvider>
        </ProfileProvider>
      </LanguageProvider>
    </ChakraProvider>
  </React.StrictMode>
);
