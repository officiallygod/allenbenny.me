import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalProjects: React.FC = () => {
  const { projects } = useProfile();

  return (
    <section id="exp-projects" className="exp-section exp-container">
      <h2 className="exp-heading-neon" data-text="PROJECTS // REPOSITORY" style={{ marginBottom: '100px', transform: 'rotate(-3deg)' }}>
        PROJECTS // REPOSITORY
      </h2>
      
      <div className="exp-grid-loose">
        {projects.map((proj, idx) => (
          <div 
            key={idx} 
            className="exp-card-scatter" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              borderColor: 'var(--exp-neon-pink)',
              boxShadow: '-15px 15px 0px rgba(255, 16, 122, 0.3)',
              transform: `translateY(${idx % 2 !== 0 ? '100px' : '0'}) rotate(${idx % 2 === 0 ? '2deg' : '-2deg'})`
            }}
          >
            <span className="exp-card-scatter-meta" style={{ color: 'var(--exp-neon-blue)' }}>{proj.date}</span>
            <h3 className="exp-card-scatter-title">{proj.title}</h3>
            <p className="exp-card-desc" style={{ flexGrow: 1 }}>{proj.description}</p>
            
            <div style={{ marginTop: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {proj.link && (
                <a href={proj.link} target="_blank" rel="noreferrer" className="exp-btn-funky" style={{ background: 'var(--exp-neon-blue)', boxShadow: '6px 6px 0px var(--exp-neon-pink)' }}>
                  VIEW
                </a>
              )}
              {proj.githubLink && (
                <a href={proj.githubLink} target="_blank" rel="noreferrer" className="exp-btn-funky" style={{ background: 'var(--exp-neon-green)', color: '#000', boxShadow: '6px 6px 0px var(--exp-neon-blue)' }}>
                  GITHUB
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperimentalProjects;
