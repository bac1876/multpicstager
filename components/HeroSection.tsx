import React from 'react';
import { motion } from 'framer-motion';
import AnimatedGradientText from './ui/animated-gradient-text';
import ShimmerButton from './ui/shimmer-button';
import { DotPattern } from './ui/dot-pattern';
import { cn } from '../lib/utils';
import { SparklesIcon } from './IconComponents';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <div className="relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-background py-20">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
        )}
      />

      <div className="z-10 flex flex-col items-center gap-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatedGradientText>
            <SparklesIcon className="mr-2 h-4 w-4" />
            <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
              Powered by Google Gemini AI
            </span>
          </AnimatedGradientText>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-4xl text-center text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Transform Your Spaces with{' '}
          <span className="inline-block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            AI Magic
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-center text-lg text-gray-400 sm:text-xl"
        >
          Professional room staging powered by advanced AI. Upload your photos, customize every detail, and watch as AI creates stunning, photorealistic designs in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <ShimmerButton
            className="text-lg font-semibold"
            onClick={onGetStarted}
            background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          >
            <SparklesIcon className="mr-2 h-5 w-5" />
            Get Started
          </ShimmerButton>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 grid grid-cols-3 gap-8 text-center"
        >
          <div>
            <div className="text-3xl font-bold text-white">10+</div>
            <div className="text-sm text-gray-400">Design Styles</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">Unlimited</div>
            <div className="text-sm text-gray-400">Restaging</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">&lt;30s</div>
            <div className="text-sm text-gray-400">Processing Time</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
