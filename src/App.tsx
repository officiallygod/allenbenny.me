import React from 'react';
import Header from './components/Header';
import About from './components/About';
import Technologies from './components/Technologies';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Header />
      <About />
      <Technologies />
    </div>
  );
};

export default App;
