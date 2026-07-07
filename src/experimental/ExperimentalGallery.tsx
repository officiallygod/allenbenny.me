import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalGallery: React.FC = () => {
  const { projects } = useProfile();
  
  // Projects that have live links that can be iframed
  const liveProjects = projects.filter(p => p.link && !p.link.includes('github.com'));

  return (
    <section className="exp-section exp-container">
      <h2 className="exp-heading-neon" style={{ marginBottom: '60px', color: 'transparent', WebkitTextStroke: '1.5px var(--exp-neon-yellow)' }}>
        LIVE PREVIEWS // GALLERY
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
        {liveProjects.map((proj, idx) => (
          <div key={idx} style={{ 
            border: '2px solid var(--exp-neon-yellow)', 
            padding: '20px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            position: 'relative'
          }}>
            <h3 className="exp-card-title" style={{ color: 'var(--exp-neon-yellow)', marginBottom: '20px' }}>
              {proj.title}
            </h3>
            
            <div style={{ 
              width: '100%', 
              height: '600px', 
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer' /* Touch feel icon requested in earlier history */
            }}>
              {/* Invisible overlay to prevent clicking out if requested, though they said usable */}
              <iframe 
                src={proj.link} 
                title={proj.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperimentalGallery;
