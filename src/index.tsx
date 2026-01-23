import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
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
      <ProfileProvider>
        <ResumeProvider>
          <App />
        </ResumeProvider>
      </ProfileProvider>
    </ChakraProvider>
  </React.StrictMode>
);
