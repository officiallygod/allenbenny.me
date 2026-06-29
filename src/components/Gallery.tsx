import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Gallery.css';

// Import all screenshots
// You can replace these files in src/assets/gallery/ with your real screenshots!
import smartFarmingImg from '../assets/gallery/smart_farming.png';
import mouseMovementsImg from '../assets/gallery/mouse_movements.png';
import coronaiImg from '../assets/gallery/coronai.png';
import flutterLoadingKitImg from '../assets/gallery/flutter_loading_kit.png';
import recallaImg from '../assets/gallery/recalla.png';
import deutschwayImg from '../assets/gallery/deutschway.png';
import roameroImg from '../assets/gallery/roamero.png';

const galleryItems = [
  { id: 'recalla', src: recallaImg, alt: 'Recalla' },
  { id: 'deutschway', src: deutschwayImg, alt: 'Deutschway' },
  { id: 'roamero', src: roameroImg, alt: 'Roamero' },
  { id: 'smart_farming', src: smartFarmingImg, alt: 'Smart Farming IoT System' },
  { id: 'mouse_movements', src: mouseMovementsImg, alt: 'Automating Mouse Movements' },
  { id: 'coronai', src: coronaiImg, alt: 'CORONAI' },
  { id: 'flutter_loading_kit', src: flutterLoadingKitImg, alt: 'Flutter Loading Kit' },
];

const Gallery: React.FC = () => {
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  };

  return (
    <section id="gallery" className="gallery-section">
      <motion.div
        className="gallery-container"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Project Showcase
        </motion.h2>
        
        <motion.p 
          className="gallery-subtitle"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          A visual gallery of my professional work. Drop your real screenshots into the <code>src/assets/gallery</code> folder!
        </motion.p>

        <div className="gallery-grid">
          {galleryItems.map((item) => (
            <motion.div
              key={item.id}
              className="gallery-item"
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="gallery-image-wrapper">
                <img src={item.src} alt={item.alt} loading="lazy" />
                <div className="gallery-overlay">
                  <span className="gallery-caption">{item.alt}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Gallery;
