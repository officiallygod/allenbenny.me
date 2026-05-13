import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useResume } from '../contexts/ResumeContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Resume.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Resume: React.FC = () => {
  const { isResumeOpen, openResume, closeResume } = useResume();
  const { t, language } = useLanguage();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isResumeOpen) {
      const bodyStyle = document.body.style;
      const htmlStyle = document.documentElement.style;
      const originalOverflow = bodyStyle.overflow;
      const originalHtmlOverflow = htmlStyle.overflow;
      const originalOverscrollBehavior = bodyStyle.overscrollBehavior;
      const originalHtmlOverscrollBehavior = htmlStyle.overscrollBehavior;

      bodyStyle.overflow = 'hidden';
      htmlStyle.overflow = 'hidden';
      bodyStyle.overscrollBehavior = 'none';
      htmlStyle.overscrollBehavior = 'none';

      return () => {
        bodyStyle.overflow = originalOverflow;
        htmlStyle.overflow = originalHtmlOverflow;
        bodyStyle.overscrollBehavior = originalOverscrollBehavior;
        htmlStyle.overscrollBehavior = originalHtmlOverscrollBehavior;
      };
    }
  }, [isResumeOpen]);

  // Measure container width so the pages fill the viewer
  const measureWidth = useCallback(() => {
    if (contentRef.current) {
      setPageWidth(Math.floor(contentRef.current.clientWidth) - 32);
    }
  }, []);

  useEffect(() => {
    if (!isResumeOpen) return;
    // Small delay to let the modal render and measure correctly
    const id = window.setTimeout(measureWidth, 50);
    window.addEventListener('resize', measureWidth);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', measureWidth);
    };
  }, [isResumeOpen, measureWidth]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    measureWidth();
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
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resume-newtab-btn"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open in new tab"
                  >
                    <span aria-hidden="true">↗</span>
                  </a>
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
                      <a
                        href={resumePath}
                        download={downloadFilename}
                        className="resume-download-btn"
                      >
                        <span aria-hidden="true">⬇</span> {t.resume.download}
                      </a>
                    </div>
                  }
                >
                  {Array.from({ length: numPages }, (_, i) => (
                    <Page
                      key={`page_${i + 1}`}
                      pageNumber={i + 1}
                      width={pageWidth > 0 ? pageWidth : undefined}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="resume-pdf-page"
                    />
                  ))}
                </Document>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Resume;
