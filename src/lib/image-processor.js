// Helper function to convert image URL to base64
const urlToBase64 = async (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL());
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

// Convert data URL to File object
const dataURLtoFile = async (dataUrl, filename) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
};

// Image overlay processor using Gemini API
export const overlayOutfitOnPhoto = async (userPhotoUrl, outfitUrl) => {
  try {
    // Convert images to File objects
    const userPhotoFile = userPhotoUrl.startsWith('data:')
      ? await dataURLtoFile(userPhotoUrl, 'user-photo.jpg')
      : await fetch(userPhotoUrl).then(r => r.blob()).then(blob => new File([blob], 'user-photo.jpg', { type: blob.type }));

    const outfitFile = outfitUrl.startsWith('data:')
      ? await dataURLtoFile(outfitUrl, 'outfit.png')
      : await fetch(outfitUrl).then(r => r.blob()).then(blob => new File([blob], 'outfit.png', { type: blob.type }));

    // Create FormData
    const formData = new FormData();
    formData.append('personImage', userPhotoFile);
    formData.append('clothingImage', outfitFile);

    // Call the backend API
    const response = await fetch('http://localhost:3001/api/try-on', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to generate image');
    }

    const data = await response.json();

    // Return the generated image as data URL
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
