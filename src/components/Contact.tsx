import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../contexts/ProfileContext';
import SocialIcon from './SocialIcon';
import '../styles/Contact.css';

const Contact: React.FC = () => {
  const { githubUrl, socialLinks, contact, portfolioUrl, personalSiteUrl } = useProfile();

  return (
    <section id="contact" className="contact-section">
      <motion.div
        className="contact-container"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Let's Connect
        </motion.h2>
        
        <motion.p
          className="contact-text"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Seeking Werkstudent opportunities (15-20h/week) in Karlsruhe and surrounding areas.
          Let's discuss how I can contribute to your team!
        </motion.p>

        <motion.div
          className="contact-info"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <a href={`mailto:${contact.email}`} className="contact-link-text">{contact.email}</a>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📱</span>
            <a href={`tel:${contact.phone}`} className="contact-link-text">{contact.phone}</a>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📍</span>
            <span className="contact-link-text">{contact.location}</span>
          </div>
        </motion.div>

        <motion.div
          className="contact-links"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {socialLinks.map((link, index) => (
            <motion.a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <SocialIcon type={link.icon} className="link-icon" />
              <span className="link-text">{link.name}</span>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          className="portfolio-links"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.a
            href={portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="portfolio-button"
            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(59, 130, 246, 0.35)' }}
            whileTap={{ scale: 0.95 }}
          >
            View Portfolio
          </motion.a>
          <motion.a
            href={personalSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="portfolio-button secondary"
            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.35)' }}
            whileTap={{ scale: 0.95 }}
          >
            Personal Site
          </motion.a>
        </motion.div>

        <motion.div
          className="github-highlight"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <p className="github-text">Top contributor at Newfold Digital • Check out my open-source work</p>
          <motion.a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="github-button"
            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(37, 99, 235, 0.35)' }}
            whileTap={{ scale: 0.95 }}
          >
            <SocialIcon type="github" className="github-icon" />
            <span>Visit GitHub Profile</span>
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Contact;
