import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalTechnologies: React.FC = () => {
  const { technologies } = useProfile();

  return (
    <section className="exp-section exp-container">
      <h2 className="exp-heading-neon" style={{ marginBottom: '60px', textAlign: 'center', WebkitTextStroke: '1.5px var(--exp-neon-green)' }}>
        TECH STACK // SYS INFO
      </h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
        {technologies.map((tech, idx) => {
          const color = idx % 3 === 0 ? 'var(--exp-neon-pink)' : idx % 2 === 0 ? 'var(--exp-neon-blue)' : 'var(--exp-neon-green)';
          return (
            <div 
              key={idx} 
              style={{ 
                border: `1px solid ${color}`,
                color: color,
                padding: '10px 20px',
                fontFamily: 'monospace',
                fontSize: '1.1rem',
                textTransform: 'uppercase',
                backdropFilter: 'blur(10px)',
                background: 'rgba(0,0,0,0.5)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = color;
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.boxShadow = `0 0 15px ${color}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
                e.currentTarget.style.color = color;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {tech.name}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ExperimentalTechnologies;
