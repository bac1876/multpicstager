
import React from 'react';
import { MagicWandIcon } from './IconComponents';

export const Header: React.FC = () => {
  return (
    <header className="text-center mb-8 md:mb-12">
      <div className="flex items-center justify-center gap-4 mb-4">
        <MagicWandIcon className="h-10 w-10 text-indigo-500" />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
          AI Room Restyler
        </h1>
      </div>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Upload your room photos, pick a room type, and let our AI magically restage them into stunning new designs.
      </p>
    </header>
  );
};
