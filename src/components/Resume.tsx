import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useResume } from '../contexts/ResumeContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Resume.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const Resume: React.FC = () => {
  const { isResumeOpen, openResume, closeResume } = useResume();
  const { t, language } = useLanguage();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isResumeOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setPageNumber(1);

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isResumeOpen]);

  // Measure container width so the page fills the viewer
  const measureWidth = useCallback(() => {
    if (contentRef.current) {
      setPageWidth(contentRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    if (!isResumeOpen) return;
    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, [isResumeOpen, measureWidth]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleOpenResume = () => openResume();
  const handleCloseResume = () => closeResume();

  // Use language-specific resume
  const resumePath = language === 'en' ? '/documents/resume-en.pdf' : '/documents/resume.pdf';
  const downloadFilename = language === 'en' ? 'Allen_Benny_Resume_EN.pdf' : 'Allen_Benny_Resume_DE.pdf';

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
                    href={resumePath}
                    download={downloadFilename}
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

              <div className="resume-viewer-content" ref={contentRef}>
                <Document
                  file={resumePath}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="resume-loading">
                      <div className="resume-spinner" aria-label="Loading" />
                    </div>
                  }
                  error={
                    <div className="resume-error">
                      <p>Failed to load PDF.</p>
                      <a href={resumePath} download={downloadFilename} className="resume-download-btn">
                        <span aria-hidden="true">⬇</span> {t.resume.download}
                      </a>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </div>

              {numPages > 1 && (
                <div className="resume-pagination">
                  <button
                    className="resume-page-btn"
                    onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                    disabled={pageNumber <= 1}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <span className="resume-page-info">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    className="resume-page-btn"
                    onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
                    disabled={pageNumber >= numPages}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Resume;
