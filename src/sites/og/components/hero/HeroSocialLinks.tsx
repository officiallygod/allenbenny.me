import React from 'react';
import { m } from 'framer-motion';
import type { SocialLink } from '../../../../shared/constants/profileData';
import SocialIcon from '../SocialIcon';
import { itemVariants } from './hero.variants';

interface HeroSocialLinksProps {
  socialLinks: SocialLink[];
}

const HeroSocialLinks: React.FC<HeroSocialLinksProps> = ({ socialLinks }) => (
  <m.div className="social-links" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}>
    {socialLinks.map((link, index) => (
      <m.a
        key={index}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="social-link"
        variants={itemVariants}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.95 }}
        aria-label={link.name}
      >
        <SocialIcon type={link.icon} className="social-icon" />
      </m.a>
    ))}
  </m.div>
);

export default HeroSocialLinks;
