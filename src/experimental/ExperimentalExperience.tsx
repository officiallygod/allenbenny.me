import React from 'react';
import { useProfile } from '../contexts/ProfileContext';

const ExperimentalExperience: React.FC = () => {
  const { experience, education } = useProfile();

  return (
    <section className="exp-section exp-container">
      <h2 className="exp-heading-neon" style={{ marginBottom: '60px' }}>EXPERIENCE // LOG</h2>
      
      <div className="exp-grid">
        {experience.map((exp, idx) => (
          <div key={idx} className="exp-card">
            <span className="exp-card-meta">{exp.duration}</span>
            <h3 className="exp-card-title">{exp.role}</h3>
            <h4 style={{ color: 'var(--exp-neon-pink)', marginBottom: '15px', textTransform: 'uppercase' }}>
              @ {exp.company}
            </h4>
            <p className="exp-card-desc">{exp.description}</p>
          </div>
        ))}
      </div>

      <h2 className="exp-heading-neon" style={{ marginTop: '100px', marginBottom: '60px', textAlign: 'right' }}>EDUCATION // LOG</h2>
      
      <div className="exp-grid">
        {education.map((edu, idx) => (
          <div key={idx} className="exp-card" style={{ borderColor: 'var(--exp-neon-green)' }}>
            <span className="exp-card-meta" style={{ color: 'var(--exp-neon-blue)' }}>{edu.duration}</span>
            <h3 className="exp-card-title">{edu.degree}</h3>
            <h4 style={{ color: 'var(--exp-neon-green)', marginBottom: '15px', textTransform: 'uppercase' }}>
              @ {edu.institution}
            </h4>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperimentalExperience;
