import React from 'react';
import { useProfile } from '../../shared/contexts/ProfileContext';

const ExperimentalExperience: React.FC = () => {
  const { experience, education } = useProfile();

  return (
    <section className="exp-section exp-container">
      <h2 className="exp-heading-neon" data-text="EXPERIENCE // LOG" style={{ marginBottom: '60px', transform: 'rotate(2deg)' }}>
        EXPERIENCE // LOG
      </h2>
      
      <div className="exp-grid-loose">
        {experience.map((exp, idx) => (
          <div 
            key={idx} 
            className="exp-card-scatter" 
            style={{ 
              transform: `rotate(${idx % 2 === 0 ? '-3deg' : '4deg'})`,
              marginTop: `${idx * 20}px` 
            }}
          >
            <span className="exp-card-scatter-meta" style={{ color: 'var(--exp-neon-pink)' }}>{exp.duration}</span>
            <h3 className="exp-card-scatter-title">{exp.role}</h3>
            <h4 style={{ color: 'var(--exp-neon-blue)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 900 }}>
              @ {exp.company}
            </h4>
            <p className="exp-card-desc">{exp.description}</p>
          </div>
        ))}
      </div>

      <h2 className="exp-heading-neon" data-text="EDUCATION // LOG" style={{ marginTop: '150px', marginBottom: '60px', textAlign: 'right', transform: 'rotate(-2deg)' }}>
        EDUCATION // LOG
      </h2>
      
      <div className="exp-grid-loose" style={{ direction: 'rtl' }}>
        {education.map((edu, idx) => (
          <div 
            key={idx} 
            className="exp-card-scatter" 
            style={{ 
              direction: 'ltr',
              borderColor: 'var(--exp-neon-green)',
              boxShadow: '-15px 15px 0px rgba(57, 255, 20, 0.3)',
              transform: `rotate(${idx % 2 === 0 ? '5deg' : '-4deg'})`
            }}
          >
            <span className="exp-card-scatter-meta" style={{ color: 'var(--exp-neon-yellow)' }}>{edu.duration}</span>
            <h3 className="exp-card-scatter-title" style={{ fontSize: '2rem' }}>{edu.degree}</h3>
            <h4 style={{ color: 'var(--exp-neon-green)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 900 }}>
              @ {edu.institution}
            </h4>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperimentalExperience;
