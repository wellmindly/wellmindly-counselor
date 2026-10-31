/**
 * Client-side image compressor.
 * Downscales images to max width/height (default 800px) and compresses to JPEG.
 * This turns 2MB-10MB mobile/camera photos into ~50KB-120KB payloads, preventing
 * Nginx 413 "Content Too Large" errors and speeding up upload dramatically.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 800,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    // If it's an SVG, don't recompress through canvas
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        resolve({
          base64Data: (e.target?.result as string) || '',
          mimeType: file.type,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
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

