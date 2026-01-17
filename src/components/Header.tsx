import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector } from '../redux/hooks';
import '../styles/Header.css';

const Header: React.FC = () => {
  const { name, title } = useAppSelector((state) => state.profile);

  return (
    <motion.header
      className="header"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <motion.h1
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {name}
      </motion.h1>
      <motion.p
        className="subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {title}
      </motion.p>
    </motion.header>
  );
};

export default Header;
