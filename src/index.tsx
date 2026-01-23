import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
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
          <ProfileProvider>
            <ResumeProvider>
              <App />
            </ResumeProvider>
          </ProfileProvider>
        </ThemeProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
