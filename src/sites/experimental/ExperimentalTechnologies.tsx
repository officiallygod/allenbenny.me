import React from 'react';
import { useProfile } from '../../shared/contexts/ProfileContext';

const ExperimentalTechnologies: React.FC = () => {
  const { technologies } = useProfile();

  return (
    <section className="exp-section exp-container">
      <h2 className="exp-heading-neon" data-text="TECH STACK // SYS INFO" style={{ marginBottom: '100px', textAlign: 'center', transform: 'rotate(-1deg)' }}>
        TECH STACK // SYS INFO
      </h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {technologies.map((tech, idx) => {
          const color = idx % 3 === 0 ? 'var(--exp-neon-pink)' : idx % 2 === 0 ? 'var(--exp-neon-blue)' : 'var(--exp-neon-green)';
          return (
            <div 
              key={idx} 
              style={{ 
                border: `3px solid ${color}`,
                color: color,
                padding: '15px 30px',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 900,
                fontSize: '1.4rem',
                textTransform: 'uppercase',
                backdropFilter: 'blur(10px)',
                background: 'rgba(0,0,0,0.8)',
                transition: 'all 0.2s',
                transform: `rotate(${Math.random() * 10 - 5}deg)`,
                boxShadow: `4px 4px 0px ${color}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = color;
                e.currentTarget.style.color = '#000';
                e.currentTarget.style.transform = 'scale(1.1) rotate(0deg)';
                e.currentTarget.style.boxShadow = `10px 10px 0px rgba(0,0,0,0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                e.currentTarget.style.color = color;
                e.currentTarget.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
                e.currentTarget.style.boxShadow = `4px 4px 0px ${color}`;
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
