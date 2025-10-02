import React from 'react';
import { motion } from 'framer-motion';
import { BorderBeam } from './ui/border-beam';

const features = [
  {
    icon: '🎨',
    title: 'Multiple Design Styles',
    description: 'Choose from 10+ professional design styles including Modern, Scandinavian, Industrial, and more.',
  },
  {
    icon: '🖌️',
    title: 'Custom Paint Colors',
    description: 'Change wall colors with AI precision. Specify your own colors or let AI choose the perfect palette.',
  },
  {
    icon: '🪵',
    title: 'Flooring Options',
    description: 'Transform floors with carpet, wood, tile, or laminate to match your vision perfectly.',
  },
  {
    icon: '📸',
    title: 'Batch Processing',
    description: 'Upload and restage up to 10 rooms at once. Perfect for real estate professionals.',
  },
  {
    icon: '💾',
    title: 'Easy Export',
    description: 'Download individual images or get all restaged rooms in a single ZIP file.',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Powered by Google Gemini 2.5 Flash for professional results in under 30 seconds.',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
          Everything You Need
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-lg text-gray-400">
          Professional-grade room staging tools powered by cutting-edge AI technology
        </p>
      </motion.div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/50 hover:bg-black/60"
          >
            <BorderBeam
              size={250}
              duration={12}
              delay={index * 2}
              borderWidth={1.5}
              colorFrom="#667eea"
              colorTo="#764ba2"
            />
            <div className="relative z-10">
              <div className="mb-4 text-5xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
