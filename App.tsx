
import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { ImageUploader } from './components/ImageUploader';
import { ImageCard } from './components/ImageCard';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { SparklesIcon, TrashIcon, DownloadIcon } from './components/IconComponents';
import type { ImageFile, ProcessingStatus, StyleType } from './types';
import { styleTypes } from './types';
import { restageImage } from './services/geminiService';
import { MAX_FILES } from './constants';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};


export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('Modern');
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const uploaderRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    setShowUploader(true);
    setTimeout(() => {
      uploaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const detectRoomTypeFromFilename = (filename: string): RoomType => {
    const lowerName = filename.toLowerCase();

    if (lowerName.includes('bedroom') || lowerName.includes('bed')) return 'Bedroom';
    if (lowerName.includes('bathroom') || lowerName.includes('bath')) return 'Bathroom';
    if (lowerName.includes('kitchen')) return 'Kitchen';
    if (lowerName.includes('living')) return 'Living room';
    if (lowerName.includes('dining')) return 'Dining room';
    if (lowerName.includes('outside') || lowerName.includes('outdoor') || lowerName.includes('patio') || lowerName.includes('deck')) return 'Outside space';

    return 'Bedroom'; // Default fallback
  };

  const handleFilesSelected = useCallback((files: FileList) => {
    setError(null);
    if (files.length > MAX_FILES) {
      setError(`You can only upload a maximum of ${MAX_FILES} images.`);
      return;
    }

    const newImages: ImageFile[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      roomType: detectRoomTypeFromFilename(file.name),
      customRoomType: '',
      status: 'idle',
      restagedUrl: null,
      error: null,
      changePaint: false,
      paintColor: '',
      changeFlooring: false,
      flooringType: 'carpet',
      additionalInstructions: '',
    }));
    setImages(newImages);
  }, []);

  const handleImageUpdate = useCallback((id: string, updates: Partial<ImageFile>) => {
    setImages(prevImages =>
      prevImages.map(img => (img.id === id ? { ...img, ...updates } : img))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    images.forEach(image => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setError(null);
    setIsProcessing(false);
  }, [images]);

  const processImage = async (imageToProcess: ImageFile) => {
      try {
        const base64Data = await fileToBase64(imageToProcess.file);
        const effectiveRoomType = imageToProcess.roomType === 'Other - describe' && imageToProcess.customRoomType ? imageToProcess.customRoomType : imageToProcess.roomType;
        
        const restageOptions = {
          changePaint: imageToProcess.changePaint,
          paintColor: imageToProcess.paintColor,
          changeFlooring: imageToProcess.changeFlooring,
          flooringType: imageToProcess.flooringType,
          style: selectedStyle,
          additionalInstructions: imageToProcess.additionalInstructions,
        };

        const restagedBase64 = await restageImage(base64Data, imageToProcess.file.type, effectiveRoomType, restageOptions);
        const restagedUrl = `data:image/jpeg;base64,${restagedBase64}`;
        
        setImages(prevImages => prevImages.map(img => 
            img.id === imageToProcess.id 
                ? { ...img, restagedUrl, status: 'done' } 
                : img
        ));
      } catch (e) {
        console.error(`Failed to restage image ${imageToProcess.file.name}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        
        setImages(prevImages => prevImages.map(img => 
            img.id === imageToProcess.id 
                ? { ...img, status: 'error', error: errorMessage } 
                : img
        ));
      }
  };

  const handleRestageAll = async () => {
    setIsProcessing(true);
    setError(null);

    setImages(prev => prev.map(img => ({ ...img, status: 'processing' as ProcessingStatus, error: null })));

    for (const imageToProcess of images) {
      await processImage(imageToProcess);
    }

    setIsProcessing(false);
  };
  
  const handleRestageSingleImage = async (imageId: string) => {
    const imageToProcess = images.find(img => img.id === imageId);
    if (!imageToProcess) return;

    // Set just this one image to processing
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, status: 'processing' as ProcessingStatus, error: null } : img));

    await processImage(imageToProcess);
  };

  const handleDownloadAll = async () => {
    const completedImages = images.filter(img => img.status === 'done' && img.restagedUrl);

    if (completedImages.length === 0) return;

    // Create a new JSZip instance
    const zip = new JSZip();

    // Add each image to the zip
    for (const image of completedImages) {
      try {
        // Convert base64 to blob
        const base64Data = image.restagedUrl!.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const sanitizedRoomType = image.roomType.toLowerCase().replace(/[\s/]/g, '-');
        const filename = `restaged-${sanitizedRoomType}-${image.id.slice(-4)}.jpeg`;

        zip.file(filename, byteArray);
      } catch (error) {
        console.error(`Failed to add ${image.id} to zip:`, error);
      }
    }

    // Generate the zip file and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `restaged-rooms-${new Date().getTime()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const allLabeled = images.every(
    (image) =>
      image.roomType &&
      (image.roomType !== 'Other - describe' ||
        (image.roomType === 'Other - describe' && image.customRoomType && image.customRoomType.trim() !== ''))
  );
  
  const hasCompletedImages = images.some(img => img.status === 'done');

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black font-sans text-white">
      <div className="container mx-auto p-4 md:p-8">
        {images.length === 0 && !showUploader && (
          <>
            <HeroSection onGetStarted={handleGetStarted} />
            <FeaturesSection />
          </>
        )}

        {(showUploader || images.length > 0) && (
          <div ref={uploaderRef}>
            <Header />
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 rounded-lg border-l-4 border-red-500 bg-red-900/20 p-4 backdrop-blur-sm"
            role="alert"
          >
            <p className="font-bold text-red-400">Error</p>
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {images.length === 0 && showUploader ? (
          <ImageUploader onFilesSelected={handleFilesSelected} />
        ) : images.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="my-6 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="w-full md:w-1/3">
                        <label htmlFor="design-style" className="mb-2 block text-sm font-medium text-gray-300">
                            Overall Design Style
                        </label>
                        <select
                            id="design-style"
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value as StyleType)}
                            className="block w-full rounded-lg border border-white/10 bg-black/60 px-4 py-3 text-white shadow-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 sm:text-sm"
                            disabled={isProcessing}
                        >
                            {styleTypes.map(style => (
                                <option key={style} value={style}>{style}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex w-full flex-col items-center justify-end gap-4 sm:flex-row md:w-auto">
                        <button
                            onClick={handleRestageAll}
                            disabled={isProcessing || !allLabeled}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                        >
                            {isProcessing ? (
                            <>
                                <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                            ) : (
                            <>
                                <SparklesIcon className="h-5 w-5" />
                                Restage All
                            </>
                            )}
                        </button>
                         <button
                            onClick={handleDownloadAll}
                            disabled={isProcessing || !hasCompletedImages}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                            title="Download all successfully restaged images"
                        >
                            <DownloadIcon className="h-5 w-5" />
                            Download All
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={isProcessing}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                        >
                            <TrashIcon className="h-5 w-5" />
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <ImageCard
                    image={image}
                    onUpdate={handleImageUpdate}
                    onRestage={handleRestageSingleImage}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
