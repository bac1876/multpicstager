import OpenAI from "openai";
import type { FlooringType, StyleType } from "../types";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY environment variable not set. API calls will fail.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true
});

export type ImageQuality = 'low' | 'medium' | 'high';

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
 * Converts a base64 string to a File object
 */
function base64ToFile(base64Data: string, mimeType: string, filename: string): File {
  // Remove data URL prefix if present
  const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  // Convert base64 to binary
  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Create blob and convert to File
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Sends an image to the OpenAI API to be restaged using gpt-image-1.
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
    let prompt = `Professionally restage this ${roomType} in a ${options.style} style. Enhance the lighting, furniture, and decor to create a high-end, aesthetically pleasing result suitable for a real estate listing.`;

    const rules: string[] = [
      'Do not make any structural changes to the room (e.g., do not add or remove walls, windows, islands, or permanent fixtures).'
    ];

    // Add paint instructions
    if (options.changePaint) {
      if (options.paintColor && options.paintColor.trim()) {
        prompt += ` Repaint the walls a ${options.paintColor.trim()} color.`;
      } else {
        prompt += ` Repaint the walls with a new, stylish, and complementary color that fits the ${options.style} theme.`;
      }
    } else {
      rules.push('Do not change the wall paint color.');
    }

    // Add flooring instructions
    if (options.changeFlooring) {
      prompt += ` Replace the flooring with new ${options.flooringType} that fits the ${options.style} theme.`;
    } else {
      rules.push('Do not change the flooring.');
    }

    // Add additional user instructions
    if (options.additionalInstructions && options.additionalInstructions.trim()) {
      prompt += ` Also, follow these specific user instructions: "${options.additionalInstructions.trim()}".`;
    }

    const fullPrompt = `${prompt} IMPORTANT: ${rules.join(' ')}`;

    // Convert base64 to File object
    const imageFile = base64ToFile(base64ImageData, mimeType, 'room-image.jpg');

    // Use images.edit API with gpt-image-1
    // Note: quality parameter is not supported by images.edit, only by images.generate
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024"
    });

    console.log('OpenAI response:', JSON.stringify(response, null, 2));

    // The response contains a URL, we need to fetch and convert to base64
    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      console.error('Full response data:', response.data);
      throw new Error(`No restaged image was returned from the API. Response: ${JSON.stringify(response.data)}`);
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = base64data.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('The API key is invalid. Please check your configuration.');
      }
      throw new Error(error.message || 'Failed to communicate with the AI model.');
    }
    throw new Error('An unknown error occurred communicating with the AI model.');
  }
};
