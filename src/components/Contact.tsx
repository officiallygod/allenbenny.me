import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../redux/hooks';
import '../styles/Contact.css';

const Contact: React.FC = () => {
  const { githubUrl, socialLinks } = useAppSelector((state) => state.profile);

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
          I'm always interested in hearing about new opportunities and collaborations.
          Feel free to reach out!
        </motion.p>

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
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <span className="link-icon">{link.icon === 'github' ? '⚡' : '💼'}</span>
              <span className="link-text">{link.name}</span>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          className="github-highlight"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <p className="github-text">Check out my projects on GitHub</p>
          <motion.a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="github-button"
            whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(106, 90, 205, 0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="github-icon">⚡</span>
            <span>Visit GitHub Profile</span>
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Contact;
