import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Resume.css';

const Resume: React.FC = () => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleOpenResume = () => {
    setIsViewerOpen(true);
  };

  const handleCloseResume = () => {
    setIsViewerOpen(false);
  };

  return (
    <>
      <section id="resume" className="resume-section">
        <motion.div
          className="resume-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.button
            className="resume-button"
            onClick={handleOpenResume}
            whileHover={{ scale: 1.05, boxShadow: '0 10px 35px rgba(16, 185, 129, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            aria-label="View resume"
          >
            <span className="resume-icon" aria-hidden="true">📄</span>
            <span className="resume-text">View My Resume</span>
          </motion.button>
        </motion.div>
      </section>

      <AnimatePresence>
        {isViewerOpen && (
          <>
            <motion.div
              className="resume-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleCloseResume}
            />
            <motion.div
              className="resume-viewer"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ duration: 0.3, type: 'spring', damping: 25 }}
            >
              <div className="resume-viewer-header">
                <h3 className="resume-viewer-title">Resume</h3>
                <div className="resume-viewer-actions">
                  <a
                    href="/documents/resume.pdf"
                    download="Allen_Benny_Resume.pdf"
                    className="resume-download-btn"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Download resume as PDF"
                  >
                    <span aria-hidden="true">⬇</span> Download
                  </a>
                  <button
                    className="resume-close-btn"
                    onClick={handleCloseResume}
                    aria-label="Close resume viewer"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </div>
              <div className="resume-viewer-content">
                <iframe
                  src="/documents/resume.pdf"
                  className="resume-iframe"
                  title="Resume Viewer"
                  sandbox="allow-same-origin"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Resume;
