import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Gallery.css';

// Import all screenshots
import smartFarmingImg from '../assets/gallery/smart_farming.png';
import mouseMovementsImg from '../assets/gallery/mouse_movements.png';
import coronaiImg from '../assets/gallery/coronai.png';
import flutterLoadingKitImg from '../assets/gallery/flutter_loading_kit.png';
import recallaImg from '../assets/gallery/recalla.png';
import deutschwayImg from '../assets/gallery/deutschway.png';
import roameroImg from '../assets/gallery/roamero.png';

const galleryItems = [
  { id: 'roamero', src: roameroImg, alt: 'Roamero', url: 'https://officiallygod.github.io/Roamero/' },
  { id: 'deutschway', src: deutschwayImg, alt: 'DeutschWay', url: 'https://officiallygod.github.io/Deutschway/' },
  { id: 'recalla', src: recallaImg, alt: 'Recalla', url: 'https://officiallygod.github.io/Recalla/' },
  { id: 'coronai', src: coronaiImg, alt: 'Coronai', url: 'https://www.youtube.com/embed/p3iMV9qt6Qs?autoplay=1&mute=1&controls=0&loop=1&playlist=p3iMV9qt6Qs' },
  { id: 'mouse_movements', src: mouseMovementsImg, alt: 'Automating Mouse Movements', url: 'https://www.researchgate.net/publication/344604018_Automating_Mouse_Movements_with_Pupil_Detection_and_OpenCV' },
  { id: 'smart_farming', src: smartFarmingImg, alt: 'Smart Farming IoT', url: 'https://www.researchgate.net/publication/345607363_Smart_Farming_IoT_Based_Water_Managing_System' },
  { id: 'flutter_loading_kit', src: flutterLoadingKitImg, alt: 'Flutter Loading Kit PUBAI', url: 'https://pub.dev/packages/flutter_loading_kit' },
];

const Gallery: React.FC = () => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const activeItem = galleryItems[currentIndex];

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
              <motion.iframe
                key={activeItem.id}
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
            </AnimatePresence>

            <div className="carousel-overlay">
              <AnimatePresence mode="wait">
                <motion.h3 
                  key={activeItem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="carousel-caption"
                >
                  {activeItem.alt}
                </motion.h3>
              </AnimatePresence>
            </div>
          </div>

          <button className="carousel-control next" onClick={handleNext} aria-label="Next image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="carousel-thumbnails">
          {galleryItems.map((item, index) => (
            <button
              key={item.id}
              className={`thumbnail-btn ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`View ${item.alt}`}
            >
              <img src={item.src} alt={`Thumbnail of ${item.alt}`} loading="lazy" />
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Gallery;
