import React, { lazy, Suspense, useEffect } from 'react';
import { LazyMotion } from 'framer-motion';
import Hero from './components/Hero';
import About from './components/About';
import Resume from './components/Resume';
import { useLanguage } from '../../shared/contexts/LanguageContext';
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

// Dynamic import of framer-motion DOM animation features
const loadFeatures = () => import('framer-motion').then(res => res.domAnimation);

const ClassicApp: React.FC = () => {
  const gameFloatRef = React.useRef<HTMLAnchorElement>(null);

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

  useEffect(() => {
    const badge = gameFloatRef.current;
    if (!badge) return;
    // On small screens, only show the W badge while the landing hero is in view.
    if (typeof window === 'undefined' || window.matchMedia('(min-width: 641px)').matches) {
      badge.classList.add('game-float--landing');
      return;
    }
    const hero = document.querySelector('.hero') || document.querySelector('section');
    if (!hero) { badge.classList.add('game-float--landing'); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        badge.classList.toggle('game-float--landing', entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <LazyMotion features={loadFeatures} strict>
      <div className="app-container">
        <a
          href="#/parallel"
          className="funky-float"
          aria-label="Feeling Funky? Visit the parallel site"
        >
          ⚡ Feeling Funky? <span className="funky-float-arrow">→ /parallel</span>
        </a>
        <Hero />
        <a
          ref={gameFloatRef}
          href="#/game"
          className="game-float"
          aria-label="Play Wordle"
        >
          <span className="game-float-w">W</span>
        </a>
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
          <Gallery />
        </Suspense>
      </ViewportSection>
      <ViewportSection id="projects">
        <Suspense fallback={<LoadingFallback />}>
          <Projects />
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
      <ViewportSection id="contact">
        <Suspense fallback={<LoadingFallback />}>
          <Contact />
        </Suspense>
      </ViewportSection>
      <Resume />
      </div>
    </LazyMotion>
  );
};

export default ClassicApp;
