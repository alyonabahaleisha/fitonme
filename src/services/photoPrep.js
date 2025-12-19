/**
 * PhotoPrep Service
 *
 * Prepares user photos ONCE for try-on:
 * - Normalize orientation
 * - Resize to target size
 * - Compress to WebP/JPEG
 * - Cache by fingerprint + version
 *
 * Never re-process the same photo.
 */

// Bump this when changing prep settings (size/quality/format)
const PREP_VERSION = 1;

// Target size for try-on (smaller = faster Gemini processing)
const TARGET_SIZE = 1024;
const TARGET_QUALITY = 0.8;
const TARGET_FORMAT = 'image/jpeg'; // More compatible than webp

// In-memory cache (fastest)
let memoryCache = {
  fingerprint: null,
  version: null,
  blob: null,
  meta: null,
};

// Track if we've loaded from IDB on boot
let hasLoadedFromIDB = false;

// IndexedDB for persistence across refresh
const DB_NAME = 'fitonme-photo-cache';
const DB_VERSION = 1;
const STORE_NAME = 'prepared-photos';

/**
 * Generate fingerprint from file metadata (fast, good enough)
 */
function generateFingerprint(file) {
  if (file instanceof File) {
    return `${file.size}-${file.lastModified}-${file.name}`;
  }
  // For data URLs or blobs, use length + timestamp
  if (typeof file === 'string') {
    return `dataurl-${file.length}-${Date.now()}`;
  }
  if (file instanceof Blob) {
    return `blob-${file.size}-${Date.now()}`;
  }
  return `unknown-${Date.now()}`;
}

/**
 * Open IndexedDB connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fingerprint' });
      }
    };
  });
}

/**
 * Get prepared photo from IndexedDB
 */
async function getFromIDB(fingerprint) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(fingerprint);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[PhotoPrep] IDB get error:', err);
    return null;
  }
}

/**
 * Save prepared photo to IndexedDB
 */
async function saveToIDB(fingerprint, blob, meta) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({
        fingerprint,
        version: PREP_VERSION,
        blob,
        meta,
        savedAt: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[PhotoPrep] IDB save error:', err);
  }
}

/**
 * Clear old entries from IDB (keep only last 3)
 */
async function cleanupIDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const entries = request.result || [];
      if (entries.length > 3) {
        // Sort by savedAt, delete oldest
        entries.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        const toDelete = entries.slice(3);
        toDelete.forEach(entry => store.delete(entry.fingerprint));
        console.log('[PhotoPrep] Cleaned up', toDelete.length, 'old entries');
      }
    };
  } catch (err) {
    console.warn('[PhotoPrep] IDB cleanup error:', err);
  }
}

/**
 * Load image from source (File, Blob, or data URL)
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (source instanceof Blob || source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else if (typeof source === 'string') {
      img.src = source;
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Process image: resize and compress
 */
async function processImage(source) {
  const startTime = performance.now();

  const img = await loadImage(source);

  // Calculate dimensions (fit within TARGET_SIZE, maintain aspect ratio)
  let width = img.width;
  let height = img.height;

  if (width > height && width > TARGET_SIZE) {
    height = Math.round((height * TARGET_SIZE) / width);
    width = TARGET_SIZE;
  } else if (height > TARGET_SIZE) {
    width = Math.round((width * TARGET_SIZE) / height);
    height = TARGET_SIZE;
  }

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob (not base64!)
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, TARGET_FORMAT, TARGET_QUALITY);
  });

  const meta = {
    width,
    height,
    bytes: blob.size,
    format: TARGET_FORMAT,
    preparedAt: Date.now(),
  };

  const prepTime = Math.round(performance.now() - startTime);
  console.log(`[PhotoPrep] Processed: ${width}x${height}, ${Math.round(blob.size/1024)}KB in ${prepTime}ms`);

  return { blob, meta };
}

/**
 * Main entry: Prepare photo for try-on
 *
 * @param {File|Blob|string} source - Original photo (File, Blob, or data URL)
 * @returns {Promise<{blob: Blob, meta: object, fingerprint: string, fromCache: boolean}>}
 */
export async function preparePhoto(source) {
  const startTime = performance.now();
  const fingerprint = generateFingerprint(source);

  // Check memory cache first (instant)
  if (memoryCache.fingerprint === fingerprint &&
      memoryCache.version === PREP_VERSION &&
      memoryCache.blob) {
    console.log('[PhotoPrep] ✓ Using memory cache (skip prep)');
    return {
      blob: memoryCache.blob,
      meta: memoryCache.meta,
      fingerprint,
      fromCache: true,
    };
  }

  // Check IndexedDB (fast)
  const cached = await getFromIDB(fingerprint);
  if (cached && cached.blob && cached.version === PREP_VERSION) {
    console.log('[PhotoPrep] ✓ Using IDB cache (skip prep)');
    // Update memory cache
    memoryCache = {
      fingerprint,
      version: PREP_VERSION,
      blob: cached.blob,
      meta: cached.meta
    };
    hasLoadedFromIDB = true;
    return {
      blob: cached.blob,
      meta: cached.meta,
      fingerprint,
      fromCache: true,
    };
  }

  // Version mismatch or not cached - need to process
  if (cached && cached.version !== PREP_VERSION) {
    console.log(`[PhotoPrep] Version mismatch (${cached.version} → ${PREP_VERSION}), re-processing`);
  }

  // Process the image (only happens once per photo or on version bump)
  console.log('[PhotoPrep] Processing new photo...');
  const { blob, meta } = await processImage(source);

  // Update memory cache
  memoryCache = { fingerprint, version: PREP_VERSION, blob, meta };

  // Save to IDB async (don't block)
  saveToIDB(fingerprint, blob, meta).then(() => {
    cleanupIDB(); // Cleanup old entries
  });

  const totalTime = Math.round(performance.now() - startTime);
  console.log(`[PhotoPrep] Total prep time: ${totalTime}ms`);

  return {
    blob,
    meta,
    fingerprint,
    fromCache: false,
  };
}

/**
 * Get prepared photo blob (for try-on requests)
 * Returns null if not prepared yet
 */
export function getPreparedBlob() {
  return memoryCache.blob;
}

/**
 * Get prepared photo as data URL (for preview display)
 */
export async function getPreparedDataUrl() {
  if (!memoryCache.blob) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(memoryCache.blob);
  });
}

/**
 * Clear all caches
 */
export function clearPreparedPhoto() {
  memoryCache = { fingerprint: null, blob: null, meta: null };
  console.log('[PhotoPrep] Cache cleared');
}

/**
 * Check if a photo is already prepared
 */
export function isPrepared(source) {
  const fingerprint = generateFingerprint(source);
  return memoryCache.fingerprint === fingerprint && memoryCache.blob !== null;
}

export default {
  preparePhoto,
  getPreparedBlob,
  getPreparedDataUrl,
  clearPreparedPhoto,
  isPrepared,
};
