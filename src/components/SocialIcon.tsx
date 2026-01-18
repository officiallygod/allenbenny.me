import React from 'react';
import { iconLabels, iconPaths } from '../constants/socialIcons';
import { SocialIconType } from '../types/social';

interface SocialIconProps {
  type: SocialIconType;
  className?: string;
}

const SocialIcon: React.FC<SocialIconProps> = ({ type, className }) => (
  <svg
    aria-label={iconLabels[type]}
    className={className}
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
  >
    <title>{iconLabels[type]}</title>
    <path fill="currentColor" d={iconPaths[type]} />
  </svg>
);

export default SocialIcon;
