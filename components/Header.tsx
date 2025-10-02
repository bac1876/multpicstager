
import React from 'react';
import { motion } from 'framer-motion';
import { MagicWandIcon } from './IconComponents';

export const Header: React.FC = () => {
  return (
    <header className="mb-12 text-center md:mb-16">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 flex items-center justify-center gap-4"
      >
        <MagicWandIcon className="h-10 w-10 text-purple-500" />
        <h1 className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
          AI Room Restyler
        </h1>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto max-w-2xl text-lg text-gray-400 md:text-xl"
      >
        Upload your room photos and let AI create stunning professional designs
      </motion.p>
    </header>
  );
};
