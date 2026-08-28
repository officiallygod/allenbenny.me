import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ClassicApp from './sites/og/ClassicApp';

// Lazy load experimental app
const ExperimentalApp = React.lazy(() => import('./sites/experimental/ExperimentalApp'));

// Lazy load parallel (Gen-Z remix) app
const ParallelApp = React.lazy(() => import('./sites/parallel/ParallelApp'));

// Lazy load Wordle game app
const WordleApp = React.lazy(() => import('./sites/game/WordleApp'));

const LoadingFallback = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    Loading...
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<ClassicApp />} />
          <Route path="/experimental" element={<ExperimentalApp />} />
          <Route path="/parallel" element={<ParallelApp />} />
          <Route path="/game" element={<WordleApp />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
