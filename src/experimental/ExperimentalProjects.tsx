import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalProjects: React.FC = () => {
  const { projects } = useProfile();

  return (
    <section id="exp-projects" className="exp-section exp-container">
      <h2 className="exp-heading-neon" style={{ marginBottom: '60px', color: 'transparent', WebkitTextStroke: '1.5px var(--exp-neon-pink)' }}>
        PROJECTS // REPOSITORY
      </h2>
      
      <div className="exp-grid">
        {projects.map((proj, idx) => (
          <div key={idx} className="exp-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="exp-card-meta">{proj.date}</span>
            <h3 className="exp-card-title">{proj.title}</h3>
            <p className="exp-card-desc" style={{ flexGrow: 1 }}>{proj.description}</p>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {proj.link && (
                <a href={proj.link} target="_blank" rel="noreferrer" className="exp-glitch-btn" style={{ padding: '8px 16px', fontSize: '0.8rem', borderWidth: '1px' }}>
                  VIEW
                </a>
              )}
              {proj.githubLink && (
                <a href={proj.githubLink} target="_blank" rel="noreferrer" className="exp-glitch-btn" style={{ padding: '8px 16px', fontSize: '0.8rem', borderWidth: '1px', borderColor: 'var(--exp-neon-green)', color: 'var(--exp-neon-green)' }}>
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
