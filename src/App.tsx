import React from 'react';
import Hero from './components/Hero';
import About from './components/About';
import Technologies from './components/Technologies';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Certifications from './components/Certifications';
import Contact from './components/Contact';
import Contributions from './components/Contributions';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Hero />
      <About />
      <Technologies />
      <Experience />
      <Projects />
      <Contributions />
      <Certifications />
      <Contact />
    </div>
  );
};

export default App;
