import api from '../api/client';

/**
 * Compresses an image file client-side using Canvas API.
 * Output: Base64 string optimized for transport (~60-80KB for a profile photo).
 */
export const compressImage = (
  file: File,
  maxDim = 400,
  quality = 0.8
): Promise<{ base64: string; mime: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e): void => {
      const img = new Image();
      img.onerror = (): void => reject(new Error('Failed to load image'));
      img.onload = (): void => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D not supported'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const base64 = canvas.toDataURL(mime, quality);
        resolve({ base64, mime });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

/**
 * Resolves a profile image URL to an absolute URL.
 * Handles data URIs, blob URLs, absolute URLs, and relative filenames.
 */
export const resolveProfileImageUrl = (url: string | null | undefined, userId?: number): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
  if (userId) return `${baseUrl}/users/${userId}/profile-image`;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
