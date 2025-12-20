/**
 * Batch Try-On Service (Frontend)
 *
 * Handles parallel outfit generation with polling for results.
 * Falls back to single try-on endpoint if batch fails.
 */

import { getPreparedBlob } from './photoPrep';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Polling configuration
const POLL_INTERVAL_MS = 2000;  // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 60;   // Max 2 minutes of polling

/**
 * Start a batch try-on job
 * @param {Blob} personImageBlob - The prepared person image
 * @param {Array} outfits - Array of outfits to try on
 * @returns {Promise<string>} - Job ID
 */
export async function startBatchJob(personImageBlob, outfits) {
  const formData = new FormData();
  formData.append('personImage', personImageBlob, 'person.jpg');
  formData.append('outfits', JSON.stringify(outfits.map(o => ({
    id: o.id,
    name: o.name,
    description: o.description,
    imageUrl: o.imageUrl,
  }))));

  // Get auth header if available
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    // Continue without auth
  }

  const response = await fetch(`${API_URL}/api/try-on-batch`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to start batch job');
  }

  const data = await response.json();
  console.log('[BATCH] Job started:', data.jobId);
  return data.jobId;
}

/**
 * Get job results
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} - Job results
 */
export async function getJobResults(jobId) {
  const response = await fetch(`${API_URL}/api/try-on-batch/${jobId}/results`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job not found');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to get results');
  }

  return response.json();
}

/**
 * Poll for results until we have at least one approved look
 * @param {string} jobId - The job ID
 * @param {Function} onNewLook - Callback when a new approved look is available
 * @param {Function} onProgress - Callback with progress updates
 * @returns {Promise<void>}
 */
export async function pollForResults(jobId, onNewLook, onProgress) {
  let lastApprovedCount = 0;
  let attempts = 0;

  const poll = async () => {
    if (attempts >= MAX_POLL_ATTEMPTS) {
      console.warn('[BATCH] Max poll attempts reached');
      return;
    }

    attempts++;

    try {
      const results = await getJobResults(jobId);

      // Report progress
      onProgress?.({
        status: results.status,
        approved: results.results.approvedCount,
        pending: results.results.pending,
        rejected: results.results.rejectedCount,
        failed: results.results.failedCount,
      });

      // Check for new approved looks
      const newApproved = results.results.approved.slice(lastApprovedCount);
      if (newApproved.length > 0) {
        console.log(`[BATCH] ${newApproved.length} new approved looks`);
        for (const look of newApproved) {
          onNewLook({
            outfitId: look.outfitId,
            image: `data:${look.mimeType};base64,${look.image}`,
            outfit: {
              id: look.outfitId,
              name: look.outfitName,
              description: look.outfitDescription,
            },
            coherenceScore: look.coherenceScore,
          });
        }
        lastApprovedCount = results.results.approvedCount;
      }

      // Continue polling if still processing
      if (results.status === 'processing' || results.results.pending > 0) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        console.log('[BATCH] Job completed');
      }
    } catch (error) {
      console.error('[BATCH] Poll error:', error);
      // Continue polling on error (might be temporary)
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  };

  // Start polling
  poll();
}

/**
 * Run batch try-on with automatic fallback to single endpoint
 * @param {string} userPhotoDataUrl - The user's photo (data URL or URL)
 * @param {Array} outfits - Outfits to try on
 * @param {Function} onFirstLook - Called when first look is ready
 * @param {Function} onNewLook - Called for each subsequent look
 * @param {Function} onProgress - Called with progress updates
 * @param {Function} fallbackSingleTryOn - Fallback function for single try-on
 */
export async function runBatchTryOn(
  userPhotoDataUrl,
  outfits,
  onFirstLook,
  onNewLook,
  onProgress,
  fallbackSingleTryOn
) {
  console.log('[BATCH] Starting batch try-on with', outfits.length, 'outfits');

  try {
    // Get prepared blob
    let personBlob = getPreparedBlob();
    if (!personBlob) {
      console.warn('[BATCH] No prepared blob, creating from data URL');
      // Convert data URL to blob
      const response = await fetch(userPhotoDataUrl);
      personBlob = await response.blob();
    }

    // Start batch job
    const jobId = await startBatchJob(personBlob, outfits);

    let firstLookSent = false;

    // Poll for results
    await pollForResults(
      jobId,
      (look) => {
        if (!firstLookSent) {
          firstLookSent = true;
          onFirstLook(look);
        } else {
          onNewLook(look);
        }
      },
      onProgress
    );

    // If no looks were approved after polling, use fallback
    if (!firstLookSent) {
      console.warn('[BATCH] No approved looks, using fallback');
      const fallbackResult = await fallbackSingleTryOn(userPhotoDataUrl, outfits[0]);
      onFirstLook({
        outfitId: outfits[0].id,
        image: fallbackResult,
        outfit: outfits[0],
      });
    }

  } catch (error) {
    console.error('[BATCH] Batch try-on failed:', error);
    console.log('[BATCH] Falling back to single try-on');

    // Fallback to single try-on
    try {
      const fallbackResult = await fallbackSingleTryOn(userPhotoDataUrl, outfits[0]);
      onFirstLook({
        outfitId: outfits[0].id,
        image: fallbackResult,
        outfit: outfits[0],
      });
    } catch (fallbackError) {
      console.error('[BATCH] Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

export default {
  startBatchJob,
  getJobResults,
  pollForResults,
  runBatchTryOn,
};
