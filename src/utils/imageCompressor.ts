/**
 * Client-side image compressor.
 * Downscales images to max width/height (default 800px) and compresses to JPEG.
 * This turns 2MB-10MB mobile/camera photos into ~50KB-120KB payloads, preventing
 * Nginx 413 "Content Too Large" errors and speeding up upload dramatically.
 */

/**
 * What the upload endpoints accept. The server checks the file's magic bytes
 * and rejects anything that is not PNG/JPEG/WebP/GIF, or larger than 5 MB
 * after decoding. This used to pass SVGs through untouched, and the server
 * stored them and served them back from the API origin.
 */
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const AVATAR_TYPES = AVATAR_ACCEPT.split(',');
/** Limit on the picked file. The resized JPEG we actually send is far smaller. */
export const AVATAR_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** Server limit on the decoded upload. */
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** A user-facing reason the file cannot be used, or null if it is fine. */
export function avatarFileError(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPEG, WebP or GIF image.';
  }
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    return 'Image is too large (maximum 15 MB). Please select a smaller photo.';
  }
  return null;
}

/** Decoded byte length of a data URL / base64 payload. */
export function base64ByteLength(base64Data: string): number {
  const b64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export async function compressImageForUpload(
  file: File,
  maxDimension = 800,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('This file could not be read. Please choose another photo.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('This file could not be opened as an image. Please choose another photo.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            base64Data: (e.target?.result as string) || '',
            mimeType: file.type,
            fileName: file.name,
          });
        }

        // Fill white background in case PNG with transparency is converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const base64Data = canvas.toDataURL(mimeType, quality);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const fileName = `${nameWithoutExt}.jpg`;

        resolve({
          base64Data,
          mimeType,
          fileName,
        });
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.readAsDataURL(file);
  });
}

