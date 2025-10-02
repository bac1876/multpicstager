
import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { MAX_FILES } from '../constants';
import { UploadCloudIcon } from './IconComponents';
import { BorderBeam } from './ui/border-beam';

interface ImageUploaderProps {
  onFilesSelected: (files: FileList) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelected(event.target.files);
      // Reset the input value so the same files can be selected again
      event.target.value = '';
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mt-10"
    >
      <div
        className={`relative flex justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-16 transition-all duration-300 ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10 scale-105'
            : 'border-white/20 bg-black/40 backdrop-blur-sm hover:border-purple-500/50 hover:bg-black/60'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <BorderBeam
            size={300}
            duration={8}
            borderWidth={2}
            colorFrom="#667eea"
            colorTo="#764ba2"
          />
        )}
        <div className="text-center">
          <motion.div
            animate={isDragging ? { scale: 1.2, rotate: 360 } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UploadCloudIcon className="mx-auto h-16 w-16 text-purple-400" />
          </motion.div>
          <div className="mt-6 flex flex-col items-center gap-2 text-base leading-6">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-black"
            >
              <span>Upload up to {MAX_FILES} files</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                multiple
                accept="image/png, image/jpeg, image/webp"
              />
            </label>
            <p className="text-gray-400">or drag and drop</p>
          </div>
          <p className="mt-4 text-sm leading-5 text-gray-500">PNG, JPG, WEBP up to 10MB each</p>
        </div>
      </div>
    </motion.div>
  );
};
