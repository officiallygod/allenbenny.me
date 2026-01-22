import React, { lazy, Suspense } from 'react';
import Hero from './components/Hero';
import './styles/App.css';

// Lazy load components that are below the fold
const About = lazy(() => import('./components/About'));
const Technologies = lazy(() => import('./components/Technologies'));
const Experience = lazy(() => import('./components/Experience'));
const Projects = lazy(() => import('./components/Projects'));
const Contributions = lazy(() => import('./components/Contributions'));
const Certifications = lazy(() => import('./components/Certifications'));
const Contact = lazy(() => import('./components/Contact'));

// Simple loading fallback
const LoadingFallback = () => (
  <div style={{ 
    minHeight: '200px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: '#64748b'
  }}>
    <div>Loading...</div>
  </div>
);

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Hero />
      <Suspense fallback={<LoadingFallback />}>
        <About />
        <Technologies />
        <Experience />
        <Projects />
        <Contributions />
        <Certifications />
        <Contact />
      </Suspense>
    </div>
  );
};

export default App;
