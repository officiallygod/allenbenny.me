import React from 'react';
import { useProfile } from '../../shared/contexts/ProfileContext';

const ExperimentalHero: React.FC = () => {
  const { name, tagline, socialLinks } = useProfile();

  return (
    <section className="exp-section exp-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="exp-heading-massive">
          {name}
        </h1>
        <h2 className="exp-heading-brush">
          Full Stack Developer
        </h2>
        
        <div style={{ marginTop: '60px', marginLeft: '5vw', position: 'relative' }}>
          <p className="exp-subheading" style={{ maxWidth: '600px', marginBottom: '60px' }}>
            {tagline}
          </p>
          
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', transform: 'rotate(2deg)' }}>
            {socialLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.url} 
                target="_blank" 
                rel="noreferrer"
                className="exp-btn-funky"
              >
                {link.name}
              </a>
            ))}
            <a 
              href="#exp-projects" 
              className="exp-btn-funky" 
              style={{ 
                background: 'var(--exp-neon-blue)', 
                boxShadow: '6px 6px 0px var(--exp-neon-pink)' 
              }}
            >
              EXPLORE
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperimentalHero;
