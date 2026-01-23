import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResume } from '../contexts/ResumeContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Resume.css';

const Resume: React.FC = () => {
  const { isResumeOpen, openResume, closeResume } = useResume();
  const { t } = useLanguage();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isResumeOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Cleanup function - restore original overflow value
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isResumeOpen]);

  const handleOpenResume = () => {
    openResume();
  };

  const handleCloseResume = () => {
    closeResume();
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
            aria-label={t.resume.viewResume}
          >
            <span className="resume-icon" aria-hidden="true">📄</span>
            <span className="resume-text">{t.resume.viewResume}</span>
          </motion.button>
        </motion.div>
      </section>

      <AnimatePresence>
        {isResumeOpen && (
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
                <h3 className="resume-viewer-title">{t.resume.modalTitle}</h3>
                <div className="resume-viewer-actions">
                  <a
                    href="/documents/resume.pdf"
                    download="Allen_Benny_Resume.pdf"
                    className="resume-download-btn"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={t.resume.download}
                  >
                    <span aria-hidden="true">⬇</span> {t.resume.download}
                  </a>
                  <button
                    className="resume-close-btn"
                    onClick={handleCloseResume}
                    aria-label={t.resume.close}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </div>
              <div className="resume-viewer-content">
                <iframe
                  src="/documents/resume.pdf"
                  className="resume-iframe"
                  title={t.resume.modalTitle}
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
