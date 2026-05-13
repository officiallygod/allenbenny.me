import React, { lazy, Suspense } from 'react';
import Hero from './components/Hero';
import About from './components/About';
import Resume from './components/Resume';
import { useLanguage } from './contexts/LanguageContext';
import './styles/App.css';
import ViewportSection from './components/ViewportSection';

// Lazy load components that are below the fold.
// Combined with ViewportSection this keeps the main bundle lean and defers heavy mounts (e.g., charts) until scrolled.
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
    <LoadingMessage />
  </div>
);

const LoadingMessage = () => {
  const { t } = useLanguage();
  return <div>{t.loading}</div>;
};

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Hero />
      <Suspense fallback={<LoadingFallback />}>
        <About />
        <ViewportSection>
          <Technologies />
        </ViewportSection>
        <ViewportSection>
          <Experience />
        </ViewportSection>
        <ViewportSection>
          <Projects />
        </ViewportSection>
        <ViewportSection>
          <Contributions />
        </ViewportSection>
        <ViewportSection>
          <Certifications />
        </ViewportSection>
        <ViewportSection>
          <Contact />
        </ViewportSection>
        <Resume />
      </Suspense>
    </div>
  );
};

export default App;
