import type { FlooringType, StyleType } from "../types";

if (!process.env.KIEAI_API_KEY) {
  console.warn("KIEAI_API_KEY environment variable not set. API calls will fail.");
}

const KIEAI_API_KEY = process.env.KIEAI_API_KEY?.trim();
const KIE_BASE_URL = "https://api.kie.ai/api/v1/playground";

interface RestageOptions {
  changePaint: boolean;
  paintColor: string;
  changeFlooring: boolean;
  flooringType: FlooringType;
  style: StyleType;
  additionalInstructions: string;
}

interface KieTaskResponse {
  code: number;
  msg: string;
  taskId?: string;
}

interface KieStatusResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    state: 'queuing' | 'processing' | 'generating' | 'success' | 'fail';
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
  };
}

/**
 * Creates a KIE.ai task to restage an image.
 * @param imageUrl Public HTTP/HTTPS URL of the image
 * @param prompt The staging prompt with instructions
 * @returns The task ID for polling
 */
export const createKieTask = async (
  imageUrl: string,
  prompt: string
): Promise<string> => {
  const response = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIEAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: {
        prompt: prompt,
        image_urls: [imageUrl]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`KIE API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  // Handle both response formats: taskId can be at root or in data.taskId
  const taskId = data.taskId || data.data?.taskId;

  if (data.code !== 200 || !taskId) {
    throw new Error(`Failed to create KIE task: ${data.msg}`);
  }

  return taskId;
};

/**
 * Checks the status of a KIE.ai task.
 * @param taskId The task ID to check
 * @returns Status object with state and result URLs if complete
 */
export const checkKieTaskStatus = async (
  taskId: string
): Promise<{
  status: 'processing' | 'completed' | 'failed';
  imageUrls?: string[];
  error?: string;
}> => {
  const response = await fetch(
    `${KIE_BASE_URL}/recordInfo?taskId=${taskId}`,
    {
      headers: {
        'Authorization': `Bearer ${KIEAI_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`KIE API error: ${response.status} ${response.statusText}`);
  }

  const data: KieStatusResponse = await response.json();

  if (data.code !== 200 || !data.data) {
    throw new Error(`Failed to check task status: ${data.msg}`);
  }

  const state = data.data.state;

  if (state === 'success' && data.data.resultJson) {
    try {
      const resultJson = JSON.parse(data.data.resultJson);
      return {
        status: 'completed',
        imageUrls: resultJson.resultUrls || []
      };
    } catch (e) {
      throw new Error('Failed to parse result JSON from KIE API');
    }
  } else if (state === 'fail') {
    return {
      status: 'failed',
      error: data.data.failMsg || 'Task failed without error message'
    };
  } else {
    // queuing, processing, or generating
    return {
      status: 'processing'
    };
  }
};

/**
 * Polls a KIE task until completion or timeout.
 * @param taskId The task ID to poll
 * @param maxAttempts Maximum number of polling attempts (default: 60)
 * @param intervalMs Milliseconds between polls (default: 2000)
 * @returns Array of result image URLs
 */
export const pollKieTask = async (
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<string[]> => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const result = await checkKieTaskStatus(taskId);

    if (result.status === 'completed' && result.imageUrls) {
      return result.imageUrls;
    } else if (result.status === 'failed') {
      throw new Error(result.error || 'Task failed');
    }
    // Otherwise keep polling
  }

  throw new Error(`Task timeout after ${(maxAttempts * intervalMs) / 1000} seconds`);
};

/**
 * Restages an image using KIE.ai API.
 * NOTE: This function requires imageUrl to be a public HTTP/HTTPS URL.
 * Use uploadBase64ToImgBB() first if you have a base64 image.
 *
 * @param imageUrl Public HTTP/HTTPS URL of the image
 * @param roomType The type of room to inform the restaging prompt
 * @param options The user-selected options for restyling
 * @returns A promise that resolves with the URL of the restaged image
 */
export const restageImageWithKie = async (
  imageUrl: string,
  roomType: string,
  options: RestageOptions
): Promise<string> => {
  try {
    // Build the prompt (same format as Gemini)
    let prompt = `Professionally restage this ${roomType} in a ${options.style} style. Enhance the lighting, furniture, and decor to create a high-end, aesthetically pleasing result suitable for a real estate listing.`;

    const rules: string[] = [
      'Do not make any structural changes to the room (e.g., do not add or remove walls, windows, islands, or permanent fixtures).'
    ];

    if (options.changePaint) {
      if (options.paintColor && options.paintColor.trim()) {
        prompt += ` Repaint the walls a ${options.paintColor.trim()} color.`;
      } else {
        prompt += ` Repaint the walls with a new, stylish, and complementary color that fits the ${options.style} theme.`;
      }
    } else {
      rules.push('Do not change the wall paint color.');
    }

    if (options.changeFlooring) {
      prompt += ` Replace the flooring with new ${options.flooringType} that fits the ${options.style} theme.`;
    } else {
      rules.push('Do not change the flooring.');
    }

    if (options.additionalInstructions && options.additionalInstructions.trim()) {
      prompt += ` Also, follow these specific user instructions: "${options.additionalInstructions.trim()}".`;
    }

    const fullPrompt = `${prompt} IMPORTANT: ${rules.join(' ')}`;

    // Create task
    const taskId = await createKieTask(imageUrl, fullPrompt);

    // Poll for completion
    const resultUrls = await pollKieTask(taskId);

    if (!resultUrls || resultUrls.length === 0) {
      throw new Error('No restaged image was returned from the KIE API.');
    }

    // Return the first result URL
    return resultUrls[0];
  } catch (error) {
    console.error("Error in KIE API call:", error);
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('The KIE API key is invalid. Please check your configuration.');
      }
      throw new Error(error.message || 'Failed to communicate with the KIE AI model.');
    }
    throw new Error('An unknown error occurred communicating with the KIE AI model.');
  }
};
