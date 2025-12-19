import { supabase } from './supabase';

// Convert data URL to Blob (faster than File for FormData)
const dataURLtoBlob = (dataUrl) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Pre-fetch and cache outfit images for faster generation
const outfitImageCache = new Map();

export const prefetchOutfitImage = async (outfitUrl) => {
  if (outfitImageCache.has(outfitUrl)) {
    return outfitImageCache.get(outfitUrl);
  }

  try {
    const response = await fetch(outfitUrl);
    const blob = await response.blob();
    outfitImageCache.set(outfitUrl, blob);
    return blob;
  } catch (error) {
    console.warn('[PREFETCH] Failed to prefetch outfit image:', error);
    return null;
  }
};

// Pre-fetch multiple outfit images (call this after style selection)
export const prefetchOutfitImages = async (outfitUrls) => {
  const promises = outfitUrls.slice(0, 5).map(url => prefetchOutfitImage(url));
  await Promise.allSettled(promises);
  console.log(`[PREFETCH] Pre-cached ${outfitImageCache.size} outfit images`);
};

// Image overlay processor using Gemini API - OPTIMIZED
export const overlayOutfitOnPhoto = async (userPhotoUrl, outfitUrl) => {
  const startTime = performance.now();

  try {
    // First, compress user photo for faster API processing
    const compressStart = performance.now();
    const compressedUserPhoto = userPhotoUrl.startsWith('data:')
      ? await compressImageForApi(userPhotoUrl, 400) // Target 400KB
      : userPhotoUrl;
    console.log(`[PERF] User photo compression took ${Math.round(performance.now() - compressStart)}ms`);

    // Run remaining async operations in parallel
    const [userPhotoBlob, outfitBlob, authResult] = await Promise.all([
      // Convert compressed user photo
      Promise.resolve(dataURLtoBlob(compressedUserPhoto)),

      // Get outfit image (check cache first)
      outfitImageCache.has(outfitUrl)
        ? Promise.resolve(outfitImageCache.get(outfitUrl))
        : fetch(outfitUrl).then(r => r.blob()),

      // Get auth session in parallel
      supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    ]);

    console.log(`[PERF] Image prep took ${Math.round(performance.now() - startTime)}ms`);

    // Create FormData with blobs
    const formData = new FormData();
    formData.append('personImage', userPhotoBlob, 'user-photo.jpg');
    formData.append('clothingImage', outfitBlob, 'outfit.png');

    // Set auth header if available
    const headers = {};
    if (authResult?.data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${authResult.data.session.access_token}`;
    }

    // Call the backend API
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiStart = performance.now();

    const response = await fetch(`${apiUrl}/api/try-on`, {
      method: 'POST',
      headers,
      body: formData,
    });

    console.log(`[PERF] API call took ${Math.round(performance.now() - apiStart)}ms`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to generate image');
    }

    const data = await response.json();
    console.log(`[PERF] Total generation took ${Math.round(performance.now() - startTime)}ms`);

    // Handle URL response (new) or base64 fallback (legacy)
    if (data.imageUrl) {
      console.log(`[PERF] Received URL response (fast delivery via CDN)`);
      return data.imageUrl;
    }

    // Fallback to base64 if server returned it
    return `data:${data.mimeType};base64,${data.image}`;
  } catch (error) {
    console.error('Error in overlayOutfitOnPhoto:', error);
    throw error;
  }
};

// Generate thumbnail
export const generateThumbnail = async (imageUrl, width = 200, height = 300) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = width;
      canvas.height = height;

      // Calculate scaling to fit
      const scale = Math.max(width / img.width, height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;

      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      resolve(canvas.toDataURL('image/webp'));
    };

    img.onerror = () => reject(new Error('Failed to generate thumbnail'));
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  });
};

// Add watermark for sharing
export const addWatermark = async (imageDataUrl, text = 'GodLovesMe AI') => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add watermark
      ctx.font = 'bold 24px Inter';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;

      const textWidth = ctx.measureText(text).width;
      const x = canvas.width - textWidth - 20;
      const y = canvas.height - 20;

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to add watermark'));
    img.src = imageDataUrl;
  });
};

// Validate uploaded photo
export const validatePhoto = (file) => {
  const errors = [];

  // Check file type
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('Image must be less than 10MB');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress image to fit localStorage limits (max 3MB for base64)
export const compressImage = (file, maxSizeMB = 3) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate max dimensions to keep aspect ratio
        // Estimate: base64 is ~1.37x larger than binary
        // Start with max 1500px on longest side for quality
        const maxDimension = 1500;

        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels until we get under size limit
        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);

        // Base64 size in MB (rough estimate: length / 1.37 / 1024 / 1024)
        while (result.length > maxSizeMB * 1024 * 1024 * 1.37 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        console.log(`[IMAGE] Compressed from ${file.size / 1024 / 1024}MB to ~${result.length / 1024 / 1024}MB (quality: ${quality})`);
        resolve(result);
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress image aggressively for API calls (target ~300-400KB)
// Smaller images = faster Gemini processing
export const compressImageForApi = (dataUrl, targetSizeKB = 400) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Max 1000px on longest side - enough for AI processing
      const maxDimension = 1000;

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Start with quality 0.8 and reduce until under target
      let quality = 0.8;
      let result = canvas.toDataURL('image/jpeg', quality);
      const targetBytes = targetSizeKB * 1024 * 1.37; // Account for base64 overhead

      while (result.length > targetBytes && quality > 0.4) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      const finalSizeKB = Math.round(result.length / 1024 / 1.37);
      console.log(`[IMAGE_API] Compressed to ${finalSizeKB}KB (${width}x${height}, quality: ${quality.toFixed(1)})`);
      resolve(result);
    };

    img.onerror = () => reject(new Error('Failed to compress image for API'));
    img.src = dataUrl;
  });
};
