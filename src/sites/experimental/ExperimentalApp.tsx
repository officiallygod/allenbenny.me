import React, { Suspense } from 'react';
import './styles/ExperimentalTheme.css';
import { useLanguage } from '../../shared/contexts/LanguageContext';

const ExperimentalHero = React.lazy(() => import('./ExperimentalHero'));
const ExperimentalExperience = React.lazy(() => import('./ExperimentalExperience'));
const ExperimentalProjects = React.lazy(() => import('./ExperimentalProjects'));
const ExperimentalTechnologies = React.lazy(() => import('./ExperimentalTechnologies'));
const ExperimentalGallery = React.lazy(() => import('./ExperimentalGallery'));

const LoadingFallback = () => (
  <div style={{ color: '#FF00FF', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '2rem', fontFamily: 'monospace' }}>
    LOADING EXPERIMENTAL ENVIRONMENT...
  </div>
);

const ExperimentalApp: React.FC = () => {
  const { toggleLanguage, language } = useLanguage();

  return (
    <div className="experimental-root">
      {/* Background brush strokes */}
      <div className="exp-bg-stroke exp-stroke-1" />
      <div className="exp-bg-stroke exp-stroke-2" />
      <div className="exp-bg-stroke exp-stroke-3" />

      {/* Global Controls */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100 }}>
        <button 
          className="exp-glitch-btn" 
          onClick={toggleLanguage}
          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
        >
          {language === 'en' ? 'DE' : 'EN'}
        </button>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <ExperimentalHero />
        <ExperimentalExperience />
        <ExperimentalGallery />
        <ExperimentalProjects />
        <ExperimentalTechnologies />
      </Suspense>
    </div>
  );
};

export default ExperimentalApp;
