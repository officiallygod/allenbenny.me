import React from 'react';
import Hero from './components/Hero';
import About from './components/About';
import Technologies from './components/Technologies';
import Experience from './components/Experience';
import Contact from './components/Contact';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Hero />
      <About />
      <Technologies />
      <Experience />
      <Contact />
    </div>
  );
};

export default App;
