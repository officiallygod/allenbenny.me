import React from 'react';
import { m } from 'framer-motion';
import { useProfile } from '../../../shared/contexts/ProfileContext';
import '../styles/Header.css';

const Header: React.FC = () => {
  const { name, title } = useProfile();

  return (
    <m.header
      className="header"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <m.h1
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {name}
      </m.h1>
      <m.p
        className="subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {title}
      </m.p>
    </m.header>
  );
};

export default Header;
