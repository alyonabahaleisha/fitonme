/**
 * Frontend service for AI-based catalog sex detection
 *
 * Calls the backend to analyze the person photo and determine
 * which outfit catalog (female/male) to use.
 */

import { API_URL } from '@/config';

/**
 * @typedef {Object} CatalogDecisionResult
 * @property {boolean} success - Whether the request succeeded
 * @property {string} catalog - 'female' or 'male'
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} reason - Decision reason ('ai', 'fallback_*')
 * @property {number} latencyMs - Time taken for decision
 * @property {string} [requestId] - Request tracking ID
 */

/**
 * Detect catalog sex from person photo
 *
 * @param {string} photoDataUrl - Base64 data URL of the person photo
 * @returns {Promise<CatalogDecisionResult>}
 */
export async function detectCatalogFromPhoto(photoDataUrl) {
  try {
    // Convert data URL to Blob
    const response = await fetch(photoDataUrl);
    const blob = await response.blob();

    // Create FormData
    const formData = new FormData();
    formData.append('personImage', blob, 'photo.jpg');

    // Call backend
    const apiResponse = await fetch(`${API_URL}/api/detect-catalog`, {
      method: 'POST',
      body: formData,
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      console.warn('[CatalogDecision] API error:', errorData);

      // Return fallback on error
      return {
        success: false,
        catalog: errorData.catalog || 'female',
        confidence: errorData.confidence || 0,
        reason: errorData.reason || 'fallback_error',
        latencyMs: 0,
      };
    }

    const data = await apiResponse.json();

    return {
      success: data.success,
      catalog: data.catalog,
      confidence: data.confidence,
      reason: data.reason,
      latencyMs: data.latencyMs,
      requestId: data.requestId,
    };

  } catch (error) {
    console.error('[CatalogDecision] Error:', error);

    // Return fallback on network/other errors
    return {
      success: false,
      catalog: 'female',
      confidence: 0,
      reason: 'fallback_error',
      latencyMs: 0,
    };
  }
}

/**
 * Map catalog sex to style preference
 *
 * @param {string} catalog - 'female' or 'male'
 * @returns {'feminine' | 'masculine'}
 */
export function catalogToStylePreference(catalog) {
  return catalog === 'male' ? 'masculine' : 'feminine';
}

/**
 * Check if the feature should auto-detect catalog
 * (based on environment variable or config)
 *
 * For now, always returns false - enable via backend feature flag
 */
export function shouldAutoDetectCatalog() {
  // This could check a frontend feature flag if needed
  // For now, the backend controls this via FEATURE_SEX_CATALOG_DECISION
  return true; // Always try - backend will return fallback if disabled
}

export default {
  detectCatalogFromPhoto,
  catalogToStylePreference,
  shouldAutoDetectCatalog,
};
