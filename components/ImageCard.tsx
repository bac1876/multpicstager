
import React from 'react';
import type { ImageFile, RoomType, FlooringType } from '../types';
import { roomTypes } from '../types';
import { ArrowRightIcon, ErrorIcon, DownloadIcon, RefreshIcon } from './IconComponents';

interface ImageCardProps {
  image: ImageFile;
  onUpdate: (id: string, updates: Partial<ImageFile>) => void;
  onRestage: (id: string) => void;
}

const SkeletonLoader: React.FC = () => (
  <div className="w-full h-full bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; }> = ({ checked, onChange, disabled }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" disabled={disabled} />
      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}></div>
    </label>
);

export const ImageCard: React.FC<ImageCardProps> = ({ image, onUpdate, onRestage }) => {
  const isProcessing = image.status === 'processing';

  const handleDownload = () => {
    if (!image.restagedUrl) return;
    const link = document.createElement('a');
    link.href = image.restagedUrl;
    const sanitizedRoomType = image.roomType.toLowerCase().replace(/[\s/]/g, '-');
    link.download = `restaged-${sanitizedRoomType}-${image.id.slice(-4)}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden flex flex-col transition-transform duration-300 hover:scale-105">
      <div className="p-4">
        <label htmlFor={`room-type-${image.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Room Type
        </label>
        <select
          id={`room-type-${image.id}`}
          name={`room-type-${image.id}`}
          value={image.roomType}
          onChange={(e) => onUpdate(image.id, { roomType: e.target.value as RoomType, customRoomType: '' })}
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={isProcessing}
        >
          {roomTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {image.roomType === 'Other - describe' && (
          <div className="mt-2">
            <label htmlFor={`custom-room-type-${image.id}`} className="sr-only">
              Describe the room
            </label>
            <input
              id={`custom-room-type-${image.id}`}
              type="text"
              value={image.customRoomType || ''}
              onChange={(e) => onUpdate(image.id, { customRoomType: e.target.value })}
              placeholder="e.g., Home Office, Nursery"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              aria-label="Describe the room type"
              disabled={isProcessing}
            />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
         <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Restyling Options</h4>
         {/* Paint Options */}
         <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">Change Paint</label>
                <ToggleSwitch checked={image.changePaint} onChange={(e) => onUpdate(image.id, { changePaint: e.target.checked })} disabled={isProcessing} />
            </div>
            {image.changePaint && (
                <input
                    type="text"
                    value={image.paintColor}
                    onChange={(e) => onUpdate(image.id, { paintColor: e.target.value })}
                    placeholder="Optional: e.g., 'warm beige'"
                    className="block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={isProcessing}
                />
            )}
         </div>
         {/* Flooring Options */}
         <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">Change Flooring</label>
                <ToggleSwitch checked={image.changeFlooring} onChange={(e) => onUpdate(image.id, { changeFlooring: e.target.checked })} disabled={isProcessing} />
            </div>
            {image.changeFlooring && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <label className="flex items-center text-sm">
                        <input type="radio" name={`flooring-${image.id}`} value="carpet" checked={image.flooringType === 'carpet'} onChange={() => onUpdate(image.id, { flooringType: 'carpet' as FlooringType })} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" disabled={isProcessing}/>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Carpet</span>
                    </label>
                     <label className="flex items-center text-sm">
                        <input type="radio" name={`flooring-${image.id}`} value="wood" checked={image.flooringType === 'wood'} onChange={() => onUpdate(image.id, { flooringType: 'wood' as FlooringType })} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" disabled={isProcessing}/>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Wood</span>
                    </label>
                     <label className="flex items-center text-sm">
                        <input type="radio" name={`flooring-${image.id}`} value="tile" checked={image.flooringType === 'tile'} onChange={() => onUpdate(image.id, { flooringType: 'tile' as FlooringType })} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" disabled={isProcessing}/>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Tile</span>
                    </label>
                     <label className="flex items-center text-sm">
                        <input type="radio" name={`flooring-${image.id}`} value="laminate" checked={image.flooringType === 'laminate'} onChange={() => onUpdate(image.id, { flooringType: 'laminate' as FlooringType })} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" disabled={isProcessing}/>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Laminate</span>
                    </label>
                </div>
            )}
         </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <label htmlFor={`instructions-${image.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Instructions (Optional)
        </label>
        <textarea
            id={`instructions-${image.id}`}
            rows={3}
            value={image.additionalInstructions}
            onChange={(e) => onUpdate(image.id, { additionalInstructions: e.target.value })}
            placeholder="e.g., add a large plant in the corner, use gold accents, make the style more kid-friendly"
            className="block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            disabled={isProcessing}
        />
      </div>

      <div className="grid grid-cols-2 gap-1 items-center px-4 pb-4 flex-grow relative">
        {/* Original Image */}
        <div className="relative aspect-square">
          <img src={image.previewUrl} alt="Original room" className="object-cover w-full h-full rounded-lg" />
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">Original</div>
        </div>

        {/* Arrow Separator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-200 dark:border-gray-600">
            <ArrowRightIcon className="h-6 w-6 text-indigo-500" />
        </div>

        {/* Restaged Image */}
        <div className="relative aspect-square">
          {image.status === 'processing' && <SkeletonLoader />}
          {image.status === 'done' && image.restagedUrl && (
            <>
              <img src={image.restagedUrl} alt="Restaged room" className="object-cover w-full h-full rounded-lg" />
              <div className="absolute bottom-1 right-1 bg-indigo-600 bg-opacity-70 text-white text-xs px-2 py-1 rounded">Restaged</div>
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <button
                    onClick={handleDownload}
                    className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    aria-label="Download restaged image"
                    title="Download restaged image"
                >
                    <DownloadIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                    onClick={() => onRestage(image.id)}
                    className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    aria-label="Restage this image again"
                    title="Restage this image again"
                >
                    <RefreshIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            </>
          )}
          {image.status === 'error' && (
             <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg text-center p-2">
                <ErrorIcon className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Processing Failed</p>
                <p className="text-xs text-red-500 dark:text-red-400/80 mt-1">{image.error || 'An error occurred.'}</p>
                 <button 
                    onClick={() => onRestage(image.id)}
                    className="mt-3 px-3 py-1 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                 >
                    Try Again
                </button>
             </div>
          )}
          {(image.status === 'idle') && (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Waiting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
