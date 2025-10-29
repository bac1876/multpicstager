/**
 * Service for uploading base64 images to a temporary hosting service.
 * Required for KIE.ai API which only accepts public HTTP/HTTPS URLs.
 */

if (!process.env.IMGBB_API_KEY) {
  console.warn("IMGBB_API_KEY environment variable not set. Image upload will fail.");
}

const IMGBB_API_KEY = process.env.IMGBB_API_KEY?.trim();

/**
 * Uploads a base64 image to ImgBB and returns a public URL.
 * Images auto-expire after 10 minutes (600 seconds).
 *
 * @param base64Data Base64-encoded image data (with or without data URI prefix)
 * @returns Public HTTP URL of the uploaded image
 */
export const uploadBase64ToImgBB = async (base64Data: string): Promise<string> => {
  if (!IMGBB_API_KEY) {
    throw new Error('ImgBB API key is not configured. Please set IMGBB_API_KEY environment variable.');
  }

  try {
    // Remove data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Create form data
    const params = new URLSearchParams();
    params.append('image', cleanBase64);
    params.append('expiration', '600'); // Auto-delete after 10 minutes

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    if (!response.ok) {
      throw new Error(`ImgBB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.data?.url) {
      throw new Error('Failed to upload image to ImgBB');
    }

    return data.data.url;
  } catch (error) {
    console.error('Error uploading to ImgBB:', error);
    if (error instanceof Error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
    throw new Error('Image upload failed with unknown error');
  }
};

/**
 * Alternative: Upload to Catbox.moe (no API key required, but less reliable)
 * Files expire after 1 year.
 */
export const uploadBase64ToCatbox = async (base64Data: string): Promise<string> => {
  try {
    // Convert base64 to blob
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Create form data
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, 'image.jpg');

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Catbox API error: ${response.status} ${response.statusText}`);
    }

    const url = await response.text();

    if (!url || !url.startsWith('https://')) {
      throw new Error('Invalid response from Catbox');
    }

    return url.trim();
  } catch (error) {
    console.error('Error uploading to Catbox:', error);
    if (error instanceof Error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
    throw new Error('Image upload failed with unknown error');
  }
};
