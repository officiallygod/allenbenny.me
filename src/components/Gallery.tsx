import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { ExternalLink, Map, BookOpen, Languages, PlayCircle, MousePointer2, Sprout, Smartphone } from 'lucide-react';
import '../styles/Gallery.css';

const galleryItems = [
  { id: 'roamero', icon: Map, alt: 'Roamero', url: 'https://officiallygod.github.io/Roamero/#/map', allowIframe: true },
  { id: 'deutschway', icon: Languages, alt: 'DeutschWay', url: 'https://officiallygod.github.io/Deutschway/', allowIframe: true },
  { id: 'recalla', icon: BookOpen, alt: 'Recalla', url: 'https://officiallygod.github.io/Recalla/', allowIframe: true },
  { id: 'coronai', icon: PlayCircle, alt: 'Coronai', url: 'https://www.youtube.com/embed/p3iMV9qt6Qs?autoplay=1&mute=1&controls=0&loop=1&playlist=p3iMV9qt6Qs', allowIframe: true },
  { id: 'mouse_movements', icon: MousePointer2, alt: 'Automating Mouse Movements', url: 'https://www.researchgate.net/publication/344604018_Automating_Mouse_Movements_with_Pupil_Detection_and_OpenCV', allowIframe: false, fallbackText: 'Research paper published on ResearchGate regarding pupil detection and mouse automation.' },
  { id: 'smart_farming', icon: Sprout, alt: 'Smart Farming IoT', url: 'https://www.researchgate.net/publication/345607363_Smart_Farming_IoT_Based_Water_Managing_System', allowIframe: false, fallbackText: 'Research paper published on ResearchGate regarding an IoT-based water managing system.' },
  { id: 'flutter_loading_kit', icon: Smartphone, alt: 'Flutter Loading Kit PUBAI', url: 'https://pub.dev/packages/flutter_loading_kit', allowIframe: false, fallbackText: 'Open-source Flutter package published on pub.dev featuring dynamic loading indicators.' },
];

const Gallery: React.FC = React.memo(() => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const activeItem = galleryItems[currentIndex];
  const IconComponent = activeItem.icon;

  return (
    <section id="gallery" className="gallery-section custom-touch-cursor">
      <motion.div
        className="gallery-container"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="gallery-header">
          <h2 className="section-title">Live Previews</h2>
          <p className="gallery-subtitle">
            Interactive, locked live feeds of my projects.
          </p>
        </div>

        <div className="carousel-main">
          <button className="carousel-control prev" onClick={handlePrev} aria-label="Previous preview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div className="carousel-image-wrapper">
            <AnimatePresence mode="wait">
              {activeItem.allowIframe ? (
                <motion.iframe
                  key={activeItem.id + '-iframe'}
                  src={activeItem.url}
                  title={activeItem.alt}
                  sandbox="allow-scripts allow-same-origin"
                  className="carousel-active-iframe"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  loading="lazy"
                  allow="autoplay"
                />
              ) : (
                <motion.div
                  key={activeItem.id + '-fallback'}
                  className="carousel-fallback-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  <IconComponent size={64} className="fallback-icon" />
                  <h3>{activeItem.alt}</h3>
                  <p>{activeItem.fallbackText}</p>
                  <a href={activeItem.url} target="_blank" rel="noopener noreferrer" className="fallback-btn">
                    View Live <ExternalLink size={18} />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="carousel-control next" onClick={handleNext} aria-label="Next preview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="carousel-thumbnails">
          {galleryItems.map((item, index) => {
            const ThumbIcon = item.icon;
            return (
              <button
                key={item.id}
                className={`thumbnail-icon-btn ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`View ${item.alt}`}
              >
                <ThumbIcon size={28} />
              </button>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
});

export default Gallery;
