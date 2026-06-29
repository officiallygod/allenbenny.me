import React, { lazy, Suspense, useEffect } from 'react';
import Hero from './components/Hero';
import About from './components/About';
import Resume from './components/Resume';
import { useLanguage } from './contexts/LanguageContext';
import './styles/App.css';
import ViewportSection from './components/ViewportSection';

// Lazy load components that are below the fold.
const Technologies = lazy(() => import('./components/Technologies'));
const Experience = lazy(() => import('./components/Experience'));
const Projects = lazy(() => import('./components/Projects'));
const Gallery = lazy(() => import('./components/Gallery'));
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
  useEffect(() => {
    // Preload lazy components during browser idle time for maximum performance and zero lag
    const preloadComponents = () => {
      import('./components/Technologies');
      import('./components/Experience');
      import('./components/Projects');
      import('./components/Gallery');
      import('./components/Contributions');
      import('./components/Certifications');
      import('./components/Contact');
    };

    if ('requestIdleCallback' in window) {
      // Use type assertion since requestIdleCallback isn't in standard TS DOM by default on all TS versions
      (window as any).requestIdleCallback(preloadComponents);
    } else {
      setTimeout(preloadComponents, 2000);
    }
  }, []);

  return (
    <div className="app-container">
      <Hero />
      <About />
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Technologies />
        </Suspense>
      </ViewportSection>
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Experience />
        </Suspense>
      </ViewportSection>
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Projects />
        </Suspense>
      </ViewportSection>
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Gallery />
        </Suspense>
      </ViewportSection>
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Contributions />
        </Suspense>
      </ViewportSection>
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Certifications />
        </Suspense>
      </ViewportSection>
      <ViewportSection>
        <Suspense fallback={<LoadingFallback />}>
          <Contact />
        </Suspense>
      </ViewportSection>
      <Resume />
    </div>
  );
};

export default App;
