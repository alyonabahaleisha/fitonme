/**
 * AI-based catalog sex decision service
 *
 * Analyzes person photo to decide whether to use female or male outfit catalog.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

// Configuration (loaded from environment or defaults)
const config = {
  enabled: process.env.FEATURE_SEX_CATALOG_DECISION !== 'false',
  threshold: parseFloat(process.env.SEX_DECISION_THRESHOLD) || 0.70,
  timeoutMs: parseInt(process.env.SEX_DECISION_TIMEOUT_MS) || 5000,
  defaultFallback: process.env.DEFAULT_SEX_FALLBACK || 'female',
};

// Initialize Gemini AI (same instance as main server)
let genAI = null;

/**
 * Initialize the Gemini AI client
 * @param {string} apiKey - Gemini API key
 */
export function initCatalogDecisionService(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  logger.info(`[CATALOG_DECISION] Service initialized, enabled=${config.enabled}, timeout=${config.timeoutMs}ms`);
}

/**
 * @typedef {'female' | 'male'} CatalogSex
 * @typedef {'ai' | 'fallback_low_conf' | 'fallback_error' | 'fallback_timeout' | 'fallback_disabled'} DecisionReason
 *
 * @typedef {Object} SexDecision
 * @property {CatalogSex} sex - The decided catalog sex
 * @property {number} confidence - Confidence score (0.0 - 1.0)
 * @property {DecisionReason} reason - Why this decision was made
 * @property {number} latencyMs - Time taken for the decision
 */

/**
 * Decide catalog sex from person photo using AI vision
 *
 * @param {Buffer} personImageBuffer - The person image as a buffer
 * @param {string} mimeType - MIME type of the image
 * @returns {Promise<SexDecision>}
 */
export async function decideCatalogSexFromPhoto(personImageBuffer, mimeType) {
  const startTime = Date.now();
  logger.info(`[CATALOG_DECISION] Starting decision, imageSize=${personImageBuffer.length}, mime=${mimeType}`);

  // If feature is disabled, return fallback immediately
  if (!config.enabled) {
    logger.info('[CATALOG_DECISION] Feature disabled, using fallback');
    return {
      sex: config.defaultFallback,
      confidence: 0,
      reason: 'fallback_disabled',
      latencyMs: Date.now() - startTime,
    };
  }

  // If genAI not initialized, return fallback
  if (!genAI) {
    logger.error('[CATALOG_DECISION] Service not initialized');
    return {
      sex: config.defaultFallback,
      confidence: 0,
      reason: 'fallback_error',
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    logger.info(`[CATALOG_DECISION] Creating timeout promise (${config.timeoutMs}ms)...`);
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), config.timeoutMs);
    });

    logger.info('[CATALOG_DECISION] Starting AI decision call...');
    // Create the AI decision promise
    const decisionPromise = makeAIDecision(personImageBuffer, mimeType);

    // Race between AI decision and timeout
    logger.info('[CATALOG_DECISION] Racing AI call vs timeout...');
    const result = await Promise.race([decisionPromise, timeoutPromise]);
    logger.info(`[CATALOG_DECISION] Race completed, result: ${JSON.stringify(result)}`);

    const latencyMs = Date.now() - startTime;

    // Check confidence threshold
    if (result.sex === 'uncertain' || result.confidence < config.threshold) {
      logger.info(`[CATALOG_DECISION] Low confidence (${result.confidence}), using fallback`);
      return {
        sex: config.defaultFallback,
        confidence: result.confidence,
        reason: 'fallback_low_conf',
        latencyMs,
      };
    }

    logger.info(`[CATALOG_DECISION] AI decision: ${result.sex} (confidence: ${result.confidence}) in ${latencyMs}ms`);
    return {
      sex: result.sex,
      confidence: result.confidence,
      reason: 'ai',
      latencyMs,
    };

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    if (error.message === 'TIMEOUT') {
      logger.warn(`[CATALOG_DECISION] Timeout after ${config.timeoutMs}ms, using fallback`);
      return {
        sex: config.defaultFallback,
        confidence: 0,
        reason: 'fallback_timeout',
        latencyMs,
      };
    }

    logger.error(`[CATALOG_DECISION] Error: ${error.message}`);
    return {
      sex: config.defaultFallback,
      confidence: 0,
      reason: 'fallback_error',
      latencyMs,
    };
  }
}

/**
 * Make the actual AI decision call
 *
 * @param {Buffer} personImageBuffer
 * @param {string} mimeType
 * @returns {Promise<{sex: string, confidence: number}>}
 */
async function makeAIDecision(personImageBuffer, mimeType) {
  logger.info('[CATALOG_DECISION] makeAIDecision: Getting model...');
  // Use gemini-2.0-flash for fast vision analysis (text-only output)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  logger.info('[CATALOG_DECISION] makeAIDecision: Preparing image part...');
  const imagePart = {
    inlineData: {
      data: personImageBuffer.toString('base64'),
      mimeType,
    },
  };

  logger.info('[CATALOG_DECISION] makeAIDecision: Calling generateContent...');
  const prompt = `Analyze this photo to determine which clothing catalog to use.

Look at the PRIMARY person in the photo. Consider:
- Facial features (jawline, facial hair, bone structure)
- Body build and proportions
- Clothing style (if wearing gendered clothing like suit, dress, uniform)
- Overall presentation

Respond with:
- "male" for men's clothing catalog
- "female" for women's clothing catalog
- "uncertain" ONLY if truly ambiguous

Return ONLY valid JSON: {"sex": "female"|"male"|"uncertain", "confidence": <0.0-1.0>}`;

  const result = await model.generateContent([prompt, imagePart]);
  logger.info('[CATALOG_DECISION] makeAIDecision: generateContent returned, getting response...');
  const response = await result.response;
  logger.info('[CATALOG_DECISION] makeAIDecision: Got response, extracting text...');
  const text = response.text().trim();

  logger.info(`[CATALOG_DECISION] Raw AI response: ${text}`);

  // Parse JSON response
  try {
    const parsed = JSON.parse(text);

    // Validate response structure
    if (!parsed.sex || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid response structure');
    }

    // Normalize sex value
    const normalizedSex = parsed.sex.toLowerCase();
    if (!['female', 'male', 'uncertain'].includes(normalizedSex)) {
      throw new Error(`Invalid sex value: ${parsed.sex}`);
    }

    return {
      sex: normalizedSex,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
    };
  } catch (parseError) {
    logger.error(`[CATALOG_DECISION] Failed to parse AI response: ${text}`);
    throw new Error(`Invalid AI response: ${parseError.message}`);
  }
}

/**
 * Log catalog decision metrics
 *
 * @param {string} requestId - Unique request identifier
 * @param {SexDecision} decision - The decision made
 * @param {number} catalogCount - Number of outfits in selected catalog
 */
export function logCatalogDecision(requestId, decision, catalogCount = 0) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    decidedSex: decision.sex,
    confidence: decision.confidence,
    reason: decision.reason,
    latencyMs: decision.latencyMs,
    catalogCount,
  };

  logger.info('[CATALOG_DECISION_METRIC]', JSON.stringify(logEntry));

  // Could also send to analytics service here
  // e.g., sendToAnalytics('catalog_decision', logEntry);
}

/**
 * Get current configuration (for debugging/monitoring)
 */
export function getConfig() {
  return { ...config };
}

export default {
  initCatalogDecisionService,
  decideCatalogSexFromPhoto,
  logCatalogDecision,
  getConfig,
};
