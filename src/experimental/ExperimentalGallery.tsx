import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalGallery: React.FC = () => {
  const { projects } = useProfile();
  
  // Projects that have live links that can be iframed
  const liveProjects = projects.filter(p => p.link && !p.link.includes('github.com'));

  return (
    <section className="exp-section exp-container">
      <h2 className="exp-heading-neon" data-text="LIVE PREVIEWS // GALLERY" style={{ marginBottom: '100px', transform: 'rotate(2deg)' }}>
        LIVE PREVIEWS // GALLERY
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '150px' }}>
        {liveProjects.map((proj, idx) => (
          <div key={idx} className="exp-card-scatter" style={{ 
            borderColor: 'var(--exp-neon-yellow)',
            boxShadow: `-${idx % 2 === 0 ? '20px' : '-20px'} 20px 0px rgba(255, 232, 0, 0.3)`,
            transform: `rotate(${idx % 2 === 0 ? '-3deg' : '3deg'})`,
            padding: '20px'
          }}>
            <h3 className="exp-card-scatter-title" style={{ color: 'var(--exp-neon-yellow)', marginBottom: '20px' }}>
              {proj.title}
            </h3>
            
            <div style={{ 
              width: '100%', 
              height: '600px', 
              position: 'relative',
              overflow: 'hidden',
              cursor: 'crosshair', /* very experimental touch feel */
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              <iframe 
                src={proj.link} 
                title={proj.title}
                style={{ width: '100%', height: '100%', border: 'none', filter: 'contrast(1.1)' }}
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
