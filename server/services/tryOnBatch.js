/**
 * Batch Try-On Service
 *
 * Handles parallel outfit generation with quality gating.
 * - Starts K generations in parallel
 * - Quality-checks each result
 * - Stores approved looks for progressive reveal
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import logger from '../utils/logger.js';

// In-memory job storage (use Redis in production for persistence)
const jobs = new Map();

// Job cleanup after 30 minutes
const JOB_TTL_MS = 30 * 60 * 1000;

// Configuration
const CONFIG = {
  parallelCount: 4,           // Generate 4 looks in parallel
  qualityThreshold: 70,       // Minimum coherence score to pass
  generationTimeoutMs: 30000, // 30s timeout per generation
};

let genAI = null;

/**
 * Initialize the batch service with Gemini client
 */
export function initBatchService(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  logger.info('[BATCH] Service initialized');
}

/**
 * Generate a unique job ID
 */
function generateJobId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check outfit coherence using Gemini
 * Returns { pass: boolean, score: number, reason: string }
 */
async function checkOutfitCoherence(imageBase64, mimeType) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType,
      },
    };

    const prompt = `Analyze this outfit photo for styling coherence.

Check for:
1. Occasion consistency (all pieces fit one context: casual, formal, evening, etc.)
2. Silhouette logic (no conflicting layers like dress over pants unless intentional)
3. Formality match (no mixing sequins with sweatpants, etc.)
4. Completeness (shoes visible, no obvious cropping issues)
5. Visual quality (no artifacts, extra limbs, warped features)

Return JSON: {"score": 0-100, "pass": true/false, "reason": "brief explanation"}

Score guide:
- 90-100: Perfect, cohesive look
- 75-89: Good, minor issues
- 50-74: Acceptable but flawed
- Below 50: Reject (incoherent or artifacts)

Be strict. Users expect stylist-quality recommendations.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();

    const parsed = JSON.parse(text);
    const score = Math.max(0, Math.min(100, parsed.score || 0));
    const pass = score >= CONFIG.qualityThreshold;

    logger.info(`[BATCH] Coherence check: score=${score}, pass=${pass}, reason="${parsed.reason}"`);

    return {
      pass,
      score,
      reason: parsed.reason || 'No reason provided',
    };
  } catch (error) {
    logger.warn(`[BATCH] Coherence check failed: ${error.message}, defaulting to pass`);
    // On error, let it through (fail open for v1)
    return { pass: true, score: 75, reason: 'Check failed, approved by default' };
  }
}

/**
 * Generate a single outfit image
 */
async function generateSingleOutfit(personImageBase64, personMimeType, outfitImageBase64, outfitMimeType, outfitId, outfitName) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
  });

  const personPart = {
    inlineData: {
      data: personImageBase64,
      mimeType: personMimeType,
    },
  };

  const outfitPart = {
    inlineData: {
      data: outfitImageBase64,
      mimeType: outfitMimeType,
    },
  };

  const prompt = `Virtual try-on: Put the outfit from image 2 onto the person in image 1.

Keep: exact face, skin, hair, pose, background.
Replace: all clothing with the new outfit. Include shoes/accessories if shown.
Fit the outfit naturally to their body. Preserve fabric texture and pattern exactly.
Output: photorealistic fashion photo, ~1000px tall.`;

  // Timeout wrapper
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('GENERATION_TIMEOUT')), CONFIG.generationTimeoutMs);
  });

  const generatePromise = model.generateContent([prompt, personPart, outfitPart]);
  const result = await Promise.race([generatePromise, timeoutPromise]);
  const response = await result.response;

  const generatedImage = response.candidates?.[0]?.content?.parts?.find(
    part => part.inlineData
  )?.inlineData;

  if (!generatedImage) {
    throw new Error('No image in response');
  }

  return {
    imageBase64: generatedImage.data,
    mimeType: generatedImage.mimeType || 'image/png',
    outfitId,
    outfitName,
  };
}

/**
 * Convert to WebP for smaller size
 */
async function convertToWebP(imageBase64) {
  try {
    const buffer = Buffer.from(imageBase64, 'base64');
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85 })
      .toBuffer();
    return {
      base64: webpBuffer.toString('base64'),
      mimeType: 'image/webp',
    };
  } catch (error) {
    logger.warn(`[BATCH] WebP conversion failed: ${error.message}`);
    return { base64: imageBase64, mimeType: 'image/png' };
  }
}

/**
 * Start a batch generation job
 * Returns jobId immediately, processes in background
 */
export async function startBatchJob(personImageBuffer, personMimeType, outfits) {
  const jobId = generateJobId();
  const startTime = Date.now();

  // Initialize job state
  const job = {
    id: jobId,
    status: 'processing',
    startedAt: startTime,
    personImageBase64: personImageBuffer.toString('base64'),
    personMimeType,
    outfits: outfits.slice(0, CONFIG.parallelCount), // Limit to parallelCount
    results: {
      approved: [],    // Looks that passed quality check
      rejected: [],    // Looks that failed quality check
      failed: [],      // Looks that errored during generation
      pending: outfits.slice(0, CONFIG.parallelCount).length,
    },
  };

  jobs.set(jobId, job);
  logger.info(`[BATCH] Job ${jobId} started with ${job.outfits.length} outfits`);

  // Start parallel generation (don't await - runs in background)
  processJobInBackground(jobId);

  // Schedule cleanup
  setTimeout(() => {
    if (jobs.has(jobId)) {
      jobs.delete(jobId);
      logger.info(`[BATCH] Job ${jobId} cleaned up after TTL`);
    }
  }, JOB_TTL_MS);

  return jobId;
}

/**
 * Process job outfits in parallel (background)
 */
async function processJobInBackground(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  const promises = job.outfits.map(async (outfit, index) => {
    try {
      logger.info(`[BATCH] Job ${jobId} - Starting outfit ${index + 1}/${job.outfits.length}: ${outfit.name}`);

      // Fetch outfit image
      const outfitResponse = await fetch(outfit.imageUrl);
      const outfitBuffer = await outfitResponse.arrayBuffer();
      const outfitBase64 = Buffer.from(outfitBuffer).toString('base64');
      const outfitMimeType = outfitResponse.headers.get('content-type') || 'image/png';

      // Generate the try-on image
      const generated = await generateSingleOutfit(
        job.personImageBase64,
        job.personMimeType,
        outfitBase64,
        outfitMimeType,
        outfit.id,
        outfit.name
      );

      // Quality check
      const coherence = await checkOutfitCoherence(generated.imageBase64, generated.mimeType);

      // Convert to WebP
      const webp = await convertToWebP(generated.imageBase64);

      const result = {
        outfitId: outfit.id,
        outfitName: outfit.name,
        outfitDescription: outfit.description,
        image: webp.base64,
        mimeType: webp.mimeType,
        coherenceScore: coherence.score,
        coherenceReason: coherence.reason,
        generatedAt: Date.now(),
      };

      // Update job results
      if (coherence.pass) {
        job.results.approved.push(result);
        logger.info(`[BATCH] Job ${jobId} - Outfit ${outfit.name} APPROVED (score: ${coherence.score})`);
      } else {
        job.results.rejected.push(result);
        logger.info(`[BATCH] Job ${jobId} - Outfit ${outfit.name} REJECTED (score: ${coherence.score})`);
      }
    } catch (error) {
      logger.error(`[BATCH] Job ${jobId} - Outfit ${outfit.name} FAILED: ${error.message}`);
      job.results.failed.push({
        outfitId: outfit.id,
        outfitName: outfit.name,
        error: error.message,
      });
    } finally {
      job.results.pending--;
    }
  });

  // Wait for all to complete
  await Promise.allSettled(promises);

  // Sort approved by coherence score (best first)
  job.results.approved.sort((a, b) => b.coherenceScore - a.coherenceScore);

  job.status = 'completed';
  job.completedAt = Date.now();
  logger.info(`[BATCH] Job ${jobId} completed: ${job.results.approved.length} approved, ${job.results.rejected.length} rejected, ${job.results.failed.length} failed`);
}

/**
 * Get job results
 */
export function getJobResults(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }

  return {
    jobId: job.id,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    results: {
      approved: job.results.approved,
      approvedCount: job.results.approved.length,
      rejectedCount: job.results.rejected.length,
      failedCount: job.results.failed.length,
      pending: job.results.pending,
    },
  };
}

/**
 * Check if service is ready
 */
export function isReady() {
  return genAI !== null;
}

export default {
  initBatchService,
  startBatchJob,
  getJobResults,
  isReady,
};
