import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalHero: React.FC = () => {
  const { name, tagline, socialLinks } = useProfile();

  return (
    <section className="exp-section exp-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="exp-heading-massive">
          {name}
        </h1>
        <h2 className="exp-heading-neon" style={{ marginTop: '20px', marginBottom: '40px' }}>
          Full Stack Developer
        </h2>
        <p className="exp-subheading" style={{ maxWidth: '600px', marginBottom: '60px' }}>
          {tagline}
        </p>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {socialLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.url} 
              target="_blank" 
              rel="noreferrer"
              className="exp-glitch-btn"
            >
              {link.name}
            </a>
          ))}
          <a href="#exp-projects" className="exp-glitch-btn" style={{ borderColor: 'var(--exp-neon-blue)', color: 'var(--exp-neon-blue)' }}>
            EXPLORE
          </a>
        </div>
      </div>
    </section>
  );
};

export default ExperimentalHero;
