import type { FlooringType, StyleType, ImageQuality } from "../types";

interface RestageOptions {
  changePaint: boolean;
  paintColor: string;
  changeFlooring: boolean;
  flooringType: FlooringType;
  style: StyleType;
  additionalInstructions: string;
  quality: ImageQuality;
}

/**
 * Converts base64 image to JPEG format using canvas
 */
async function convertToJPEG(base64Data: string, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      // Convert to JPEG with 0.95 quality
      const jpegBase64 = canvas.toDataURL('image/jpeg', 0.95);
      // Remove the data:image/jpeg;base64, prefix
      const base64Only = jpegBase64.split(',')[1];
      resolve(base64Only);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    // Create proper data URL
    const dataUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`;
    img.src = dataUrl;
  });
}

/**
 * Converts an image URL to base64 string
 */
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert URL to base64:', error);
    throw new Error('Failed to download result image from KIE.ai');
  }
}

/**
 * Maps room types to KIE.ai format (lowercase with underscores)
 */
function mapRoomType(roomType: string): string {
  const mapping: Record<string, string> = {
    'Bedroom': 'bedroom',
    'Bathroom': 'bathroom',
    'Living room': 'living_room',
    'Dining room': 'dining_room',
    'Kitchen': 'kitchen',
    'Living room, Dining room, Kitchen combo': 'living_room',
    'Living room/Kitchen combo': 'living_room',
    'Outside space': 'outdoor',
    'Other - describe': 'living_room', // default fallback
  };

  return mapping[roomType] || 'living_room';
}

/**
 * Maps style types to KIE.ai format (lowercase with underscores)
 */
function mapStyleType(style: StyleType): string {
  return style.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Sends an image to the KIE.ai API to be restaged using asynchronous task processing.
 * @param base64ImageData The base64-encoded image data.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @param roomType The type of room to inform the restaging prompt.
 * @param options The user-selected options for restyling.
 * @returns A promise that resolves with the base64-encoded string of the restaged image.
 */
export const restageImage = async (
  base64ImageData: string,
  mimeType: string,
  roomType: string,
  options: RestageOptions
): Promise<string> => {
  try {
    // Convert image to JPEG format (KIE.ai only supports JPEG)
    console.log('Converting image to JPEG format...');
    const jpegBase64 = await convertToJPEG(base64ImageData, mimeType);
    const imageData = `data:image/jpeg;base64,${jpegBase64}`;

    // Map room type and style to KIE.ai format
    const mappedRoomType = mapRoomType(roomType);
    const mappedStyle = mapStyleType(options.style);

    // Prepare request body for KIE.ai API endpoint
    const requestBody = {
      image: imageData,
      transformation_type: 'furnish', // Default to furnish for virtual staging
      space_type: mappedRoomType === 'outdoor' ? 'exterior' : 'interior',
      room_type: mappedRoomType,
      design_style: mappedStyle,
      update_flooring: options.changeFlooring,
      block_decorative: true, // Minimize decorative items as per original settings
    };

    console.log('Submitting task to KIE.ai:', {
      room_type: mappedRoomType,
      design_style: mappedStyle,
      update_flooring: options.changeFlooring,
    });

    // Step 1: Submit task to KIE.ai via backend endpoint
    const createTaskResponse = await fetch('/api/kie-stage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!createTaskResponse.ok) {
      const errorData = await createTaskResponse.json();
      throw new Error(errorData.error || `Failed to create task (status ${createTaskResponse.status})`);
    }

    const taskResult = await createTaskResponse.json();

    if (!taskResult.success || !taskResult.taskId) {
      throw new Error(taskResult.error || 'No task ID returned from KIE.ai');
    }

    const taskId = taskResult.taskId;
    console.log('KIE.ai task created:', taskId);

    // Step 2: Poll for task completion
    const maxAttempts = 60; // Max 60 attempts (2 minutes with 2-second intervals)
    const pollInterval = 2000; // 2 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      // Wait before polling (except first attempt)
      if (attempts > 1) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // First poll after a shorter delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Polling KIE.ai status (attempt ${attempts}/${maxAttempts})...`);

      const statusResponse = await fetch(`/api/kie-check-status?taskId=${taskId}`);

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        continue; // Retry on error
      }

      const statusResult = await statusResponse.json();

      if (statusResult.status === 'completed' && statusResult.images && statusResult.images.length > 0) {
        console.log('KIE.ai task completed successfully');
        const imageUrl = statusResult.images[0];

        // Convert the result URL to base64
        const base64Result = await urlToBase64(imageUrl);
        return base64Result;
      } else if (statusResult.status === 'failed') {
        throw new Error(statusResult.error || 'Task failed at KIE.ai');
      } else if (statusResult.status === 'processing') {
        // Continue polling
        console.log('Task still processing...');
        continue;
      } else {
        console.warn('Unexpected status:', statusResult.status);
        continue;
      }
    }

    // If we've exhausted all attempts
    throw new Error('Task timed out after 2 minutes. Please try again.');

  } catch (error) {
    console.error('Error in KIE.ai service:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('The KIE.ai API key is invalid. Please check your configuration.');
      }
      if (error.message.includes('credits')) {
        throw new Error('Insufficient credits in KIE.ai account. Please add credits.');
      }
      if (error.message.includes('Rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(error.message || 'Failed to communicate with KIE.ai API.');
    }
    throw new Error(`KIE.ai API error: ${error}`);
  }
};
