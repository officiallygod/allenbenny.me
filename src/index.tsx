import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { ProfileProvider } from './contexts/ProfileContext';
import App from './App';
import './styles/global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </ChakraProvider>
  </React.StrictMode>
);
