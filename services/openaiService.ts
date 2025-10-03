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
 * Sends an image to the OpenAI API to be restaged.
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

    // Construct the image data URL
    const imageDataUrl = `data:${mimeType};base64,${base64ImageData}`;

    // Map quality to OpenAI's quality parameter
    const qualityMap: Record<ImageQuality, 'standard' | 'hd'> = {
      low: 'standard',
      medium: 'standard',
      high: 'hd'
    };

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageDataUrl,
      prompt: fullPrompt,
      quality: qualityMap[options.quality],
      n: 1,
      response_format: "b64_json",
      size: "1024x1024"
    });

    const imageData = response.data[0]?.b64_json;

    if (!imageData) {
      throw new Error('No restaged image was returned from the API.');
    }

    return imageData;
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
