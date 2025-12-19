/**
 * Configuration for AI-based catalog sex decision feature
 *
 * This feature automatically detects whether to use female or male outfit catalog
 * based on the uploaded person photo.
 */

// Feature flag - set via environment variable
const FEATURE_SEX_CATALOG_DECISION = process.env.FEATURE_SEX_CATALOG_DECISION === 'true';

// AI decision confidence threshold (0.0 - 1.0)
// Below this threshold, fallback to default
const SEX_DECISION_THRESHOLD = parseFloat(process.env.SEX_DECISION_THRESHOLD) || 0.70;

// Timeout for AI decision call (milliseconds)
// If exceeded, use fallback to avoid blocking try-on
const SEX_DECISION_TIMEOUT_MS = parseInt(process.env.SEX_DECISION_TIMEOUT_MS) || 800;

// Default fallback when AI is uncertain or fails
const DEFAULT_SEX_FALLBACK = process.env.DEFAULT_SEX_FALLBACK || 'female';

/**
 * @typedef {'female' | 'male'} CatalogSex
 */

/**
 * @typedef {'ai' | 'fallback_low_conf' | 'fallback_error' | 'fallback_timeout' | 'fallback_disabled'} DecisionReason
 */

/**
 * @typedef {Object} SexDecision
 * @property {CatalogSex} sex - The decided catalog sex
 * @property {number} confidence - Confidence score (0.0 - 1.0)
 * @property {DecisionReason} reason - Why this decision was made
 * @property {number} [latencyMs] - Time taken for the decision
 */

module.exports = {
  FEATURE_SEX_CATALOG_DECISION,
  SEX_DECISION_THRESHOLD,
  SEX_DECISION_TIMEOUT_MS,
  DEFAULT_SEX_FALLBACK,
};
