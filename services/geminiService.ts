
import { GoogleGenAI, Modality } from "@google/genai";
import type { FlooringType, StyleType } from "../types";

if (!process.env.API_KEY) {
  // In a real app, you would want to handle this more gracefully.
  // For this context, we assume the environment variable is set.
  console.warn("API_KEY environment variable not set. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface RestageOptions {
  changePaint: boolean;
  paintColor: string;
  changeFlooring: boolean;
  flooringType: FlooringType;
  style: StyleType;
  additionalInstructions: string;
}

/**
 * Sends an image to the Gemini API to be restaged.
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Check for safety blocks or other issues before looking for the image
    const firstCandidate = response.candidates?.[0];
    if (!firstCandidate) {
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            throw new Error(`Request was blocked: ${blockReason}. Please try a different image.`);
        }
        throw new Error('The AI model did not return a valid response.');
    }

    for (const part of firstCandidate.content?.parts || []) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return part.inlineData.data;
      }
    }

    throw new Error('No restaged image was returned from the API.');
  } catch (error) {
    console.error("Error in Gemini API call:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error('The API key is invalid. Please check your configuration.');
        }
        // Pass the original or our custom error message along for better UI feedback
        throw new Error(error.message || 'Failed to communicate with the AI model.');
    }
    throw new Error('An unknown error occurred communicating with the AI model.');
  }
};
