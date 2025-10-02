
import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { ImageUploader } from './components/ImageUploader';
import { ImageCard } from './components/ImageCard';
import { Header } from './components/Header';
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
      changePaint: true,
      paintColor: '',
      changeFlooring: true,
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
    <div className="min-h-screen font-sans text-gray-800 dark:text-gray-200">
      <div className="container mx-auto p-4 md:p-8">
        <Header />

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded-md" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {images.length === 0 ? (
          <ImageUploader onFilesSelected={handleFilesSelected} />
        ) : (
          <div>
            <div className="my-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="w-full md:w-1/3">
                        <label htmlFor="design-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Overall Design Style
                        </label>
                        <select
                            id="design-style"
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value as StyleType)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            disabled={isProcessing}
                        >
                            {styleTypes.map(style => (
                                <option key={style} value={style}>{style}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={handleRestageAll}
                            disabled={isProcessing || !allLabeled}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isProcessing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold text-gray-700 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                            title="Download all successfully restaged images"
                        >
                            <DownloadIcon className="h-5 w-5" />
                            Download All
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={isProcessing}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold text-gray-700 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            <TrashIcon className="h-5 w-5" />
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {images.map(image => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onUpdate={handleImageUpdate}
                  onRestage={handleRestageSingleImage}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
