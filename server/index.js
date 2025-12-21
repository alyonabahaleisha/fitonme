import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyAuth, optionalAuth } from './middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import { sendOutfitReadyEmail, sendSavedLookEmail } from './services/email.js';
import logger from './utils/logger.js';
import { apiLimiter, strictLimiter } from './middleware/rateLimiter.js';
import {
  initCatalogDecisionService,
  decideCatalogSexFromPhoto,
  logCatalogDecision
} from './services/catalogDecision.js';
import {
  initBatchService,
  startBatchJob,
  getJobResults,
  isReady as isBatchReady
} from './services/tryOnBatch.js';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy for Render/Railway/etc - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Initialize Sentry (only if DSN is present)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
  logger.info('Sentry initialized');
}

// Middleware
import helmet from 'helmet';
import sharp from 'sharp';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://m.stripe.network"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://m.stripe.network", "https://*.supabase.co"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
}));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://fitonme.vercel.app',
    'https://fitonme.ai',
    'https://www.fitonme.ai',
    'https://ilovme.ai',
    'https://www.ilovme.ai'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
// Apply global rate limiter to all requests EXCEPT health checks
app.use((req, res, next) => {
  // Skip rate limiting for health check endpoints (used by Render)
  if (req.path === '/' || req.path === '/api/health') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// IMPORTANT: Stripe webhook MUST come before express.json() middleware
// because it needs the raw body to verify the signature

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Configure multer for file uploads - USE MEMORY STORAGE for speed
// Memory storage avoids disk I/O which is much faster for small images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Catalog Decision Service (uses same Gemini API key)
initCatalogDecisionService(process.env.GEMINI_API_KEY);

// Initialize Batch Try-On Service
initBatchService(process.env.GEMINI_API_KEY);

// Initialize Stripe
logger.info('[STARTUP] Initializing Stripe...');
logger.info('[STARTUP] STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
logger.info('[STARTUP] STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length);
logger.info('[STARTUP] STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 130));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
logger.info('[STARTUP] Initializing Supabase...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to convert buffer to Gemini part (for memory storage)
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

// STRIPE WEBHOOK - Must be defined BEFORE express.json() middleware
// Webhook needs raw body for signature verification
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('[WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info('[WEBHOOK] Event received:', event.type);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      logger.info('[WEBHOOK] Checkout session completed:', session.id);
      // logger.info('[WEBHOOK] Session metadata:', session.metadata);
      // logger.info('[WEBHOOK] Customer email:', session.customer_email);

      // Update user's subscription in Supabase
      // Update user's subscription in Supabase
      // We stored userId in metadata
      const userId = session.metadata.userId;
      const mode = session.metadata.mode || 'subscription';
      const subscriptionId = session.subscription;

      logger.info('[WEBHOOK] ========== CHECKOUT SESSION DETAILS ==========');
      logger.info(`[WEBHOOK] userId from metadata: ${userId}`);
      logger.info(`[WEBHOOK] mode: ${mode}`);
      logger.info(`[WEBHOOK] subscriptionId: ${subscriptionId}`);
      logger.info(`[WEBHOOK] session.mode (Stripe): ${session.mode}`);
      logger.info(`[WEBHOOK] Full metadata: ${JSON.stringify(session.metadata)}`);
      logger.info('[WEBHOOK] ==============================================');

      if (!userId || userId === 'guest') {
        logger.error('[WEBHOOK] ERROR: Invalid userId - cannot save subscription for guest user');
        // logger.error('[WEBHOOK] Customer email:', session.customer_email);
        logger.error('[WEBHOOK] Please ensure userId is passed when creating checkout session');
        break;
      }

      // Handle One-Time Payment (1-Day Pass OR 7-Day Pass)
      if (mode === 'payment') {
        logger.info('[WEBHOOK] >>>>>> ENTERING ONE-TIME PAYMENT FLOW <<<<<<');
        try {
          const priceId = session.metadata?.priceId;
          logger.info(`[WEBHOOK] Processing one-time payment for Price ID: ${priceId}`);

          let planType = 'day_pass';
          let durationDays = 1;

          // Determine plan based on Price ID
          if (priceId === 'price_1SZOhVB6P0idJ9t7YAUC8B3g') {
            planType = 'weekly'; // 7-Day Pass is technically a "weekly" plan but one-time
            durationDays = 7;
            logger.info('[WEBHOOK] Identified as 7-Day Pass');
          } else {
            logger.info('[WEBHOOK] Defaulting to 1-Day Pass');
          }

          // Calculate access duration
          const startDate = new Date().toISOString();
          const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

          // Use session ID as pseudo-subscription ID for tracking
          const subscriptionData = {
            subscription_id: session.id, // Use session ID for one-time payments
            user_id: userId,
            plan: planType,
            status: 'active',
            start_date: startDate,
            end_date: endDate,
            stripe_customer_id: session.customer || null,
            stripe_price_id: priceId || 'unknown',
          };

          logger.info(`[WEBHOOK] Saving ${planType} subscription to database: ${JSON.stringify(subscriptionData)}`);
          const { data: subData, error: subError } = await supabase.from('subscriptions').upsert(subscriptionData).select();

          if (subError) {
            logger.error(`[WEBHOOK] ERROR inserting subscription: ${JSON.stringify(subError)}`);
            throw subError;
          }
          logger.info(`[WEBHOOK] Subscription inserted successfully: ${JSON.stringify(subData)}`);

          // Update user plan_type
          logger.info(`[WEBHOOK] Updating user plan_type to ${planType} for userId: ${userId}`);
          const { data: userData, error: userError } = await supabase.from('users').update({
            plan_type: planType,
            credits_remaining: 999999, // Unlimited
            plan_expiry: endDate // Set expiration date
          }).eq('id', userId).select();

          if (userError) {
            logger.error(`[WEBHOOK] ERROR updating user: ${JSON.stringify(userError)}`);
            throw userError;
          }
          logger.info(`[WEBHOOK] User updated successfully: ${JSON.stringify(userData)}`);

          logger.info(`[WEBHOOK] >>>>>> SUCCESS: Activated ${planType} for user ${userId} <<<<<<`);
        } catch (err) {
          logger.error(`[WEBHOOK] >>>>>> ERROR processing one-time payment: ${err.message} <<<<<<`);
          logger.error(`[WEBHOOK] Full error: ${JSON.stringify(err)}`);
        }
        break;
      }

      if (userId && subscriptionId) {
        try {
          logger.info('[WEBHOOK] Retrieving subscription from Stripe:', subscriptionId);
          // Retrieve the subscription details from Stripe to get the plan info
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          logger.info('[WEBHOOK] Subscription retrieved:', subscription.id);
          logger.info('[WEBHOOK] current_period_start:', subscription.current_period_start);
          logger.info('[WEBHOOK] current_period_end:', subscription.current_period_end);

          // Validate and convert timestamps
          const startDate = subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const endDate = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to 7 days from now

          logger.info('[WEBHOOK] Converted start_date:', startDate);
          logger.info('[WEBHOOK] Converted end_date:', endDate);

          // Map Stripe interval to database plan values
          const interval = subscription.items.data[0].price.recurring.interval;
          let planValue = 'weekly'; // default
          if (interval === 'week') planValue = 'weekly';
          if (interval === 'month') planValue = 'monthly';
          if (interval === 'year') planValue = 'annual';

          logger.info('[WEBHOOK] Stripe interval:', interval, '-> DB plan:', planValue);

          const subscriptionData = {
            subscription_id: subscription.id,
            user_id: userId,
            plan: planValue,
            status: subscription.status,
            start_date: startDate,
            end_date: endDate,
            stripe_customer_id: subscription.customer,
            stripe_price_id: subscription.items.data[0].price.id,
          };

          logger.info('[WEBHOOK] Upserting subscription to database:', subscriptionData);
          const { data: subData, error: subError } = await supabase.from('subscriptions').upsert(subscriptionData);

          if (subError) {
            logger.error('[WEBHOOK] ERROR saving subscription:', subError);
            throw subError;
          }
          logger.info('[WEBHOOK] Subscription saved successfully:', subData);

          // Update user's plan_type in users table
          // The planValue we just mapped is what we use for plan_type
          logger.info('[WEBHOOK] Updating user plan_type to:', planValue);
          const { error: userError } = await supabase.from('users').update({
            plan_type: planValue,
            credits_remaining: 999999, // Unlimited
            plan_expiry: endDate // Set expiration date
          }).eq('id', userId);

          if (userError) {
            logger.error('[WEBHOOK] ERROR updating user:', userError);
            throw userError;
          }

          logger.info('[WEBHOOK] SUCCESS: Updated subscription for user', userId, 'to', planValue);
        } catch (err) {
          logger.error('[WEBHOOK] ERROR updating subscription in Supabase:', err);
          logger.error('[WEBHOOK] Error details:', JSON.stringify(err, null, 2));
        }
      }
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscriptionUpdate = event.data.object;
      logger.info('[WEBHOOK] Subscription updated:', subscriptionUpdate.id);

      try {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('subscription_id', subscriptionUpdate.id)
          .single();

        if (existingSub) {
          // Map Stripe interval to database plan values
          const updateInterval = subscriptionUpdate.items.data[0].price.recurring.interval;
          let updatePlanValue = 'weekly';
          if (updateInterval === 'week') updatePlanValue = 'weekly';
          if (updateInterval === 'month') updatePlanValue = 'monthly';
          if (updateInterval === 'year') updatePlanValue = 'annual';

          const startDate = subscriptionUpdate.current_period_start
            ? new Date(subscriptionUpdate.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const endDate = subscriptionUpdate.current_period_end
            ? new Date(subscriptionUpdate.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await supabase.from('subscriptions').upsert({
            subscription_id: subscriptionUpdate.id,
            user_id: existingSub.user_id,
            plan: updatePlanValue,
            status: subscriptionUpdate.status,
            start_date: startDate,
            end_date: endDate,
            stripe_customer_id: subscriptionUpdate.customer,
            stripe_price_id: subscriptionUpdate.items.data[0].price.id,
          });
          logger.info('[WEBHOOK] Subscription updated in database');

          // Update user's plan_expiry in users table
          await supabase.from('users').update({
            plan_expiry: endDate
          }).eq('id', existingSub.user_id);
          logger.info('[WEBHOOK] Updated user plan_expiry');
        }
      } catch (err) {
        logger.error('[WEBHOOK] Error handling subscription update:', err);
      }
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      logger.info('[WEBHOOK] Subscription cancelled:', deletedSubscription.id);

      try {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('subscription_id', deletedSubscription.id)
          .single();

        if (existingSub) {
          await supabase.from('subscriptions').update({
            status: 'cancelled'
          }).eq('subscription_id', deletedSubscription.id);

          await supabase.from('users').update({
            plan_type: 'free'
          }).eq('id', existingSub.user_id);

          logger.info('[WEBHOOK] Subscription cancelled in database');
        }
      } catch (err) {
        logger.error('[WEBHOOK] Error handling subscription cancellation:', err);
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      logger.info('[WEBHOOK] Payment succeeded:', invoice.id);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      logger.info('[WEBHOOK] Payment failed:', failedInvoice.id);
      break;

    default:
      logger.info('[WEBHOOK] Unhandled event type:', event.type);
  }

  res.json({ received: true });
});

// Apply stricter rate limiting to sensitive endpoints
app.use('/api/create-checkout-session', strictLimiter);
app.use('/api/try-on', strictLimiter);
app.use('/api/cancel-subscription', strictLimiter);
app.use('/api/delete-account', strictLimiter);

// NOW apply express.json() middleware for all other routes
app.use(express.json());

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'FitOnMe API Server is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Detect catalog sex from person photo (AI-based)
// This endpoint analyzes the uploaded photo to decide female/male catalog
app.post('/api/detect-catalog', (req, res, next) => {
  // Set a hard timeout on the entire request (10 seconds)
  const REQUEST_TIMEOUT_MS = 10000;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info(`[DETECT_CATALOG] ${requestId} - Incoming request, setting ${REQUEST_TIMEOUT_MS}ms timeout`);

  const timeoutId = setTimeout(() => {
    logger.warn(`[DETECT_CATALOG] ${requestId} - Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Request timeout',
        catalog: 'female',
        confidence: 0,
        reason: 'fallback_timeout',
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Store requestId and cleanup function on req for use in handler
  req.catalogRequestId = requestId;
  req.clearCatalogTimeout = () => clearTimeout(timeoutId);

  // Clear timeout when response is sent
  res.on('finish', () => clearTimeout(timeoutId));

  next();
}, upload.single('personImage'), async (req, res) => {
  const requestId = req.catalogRequestId;
  const startTime = Date.now();

  logger.info(`[DETECT_CATALOG] ${requestId} - Multer completed, processing request`);

  try {
    if (!req.file) {
      logger.warn(`[DETECT_CATALOG] ${requestId} - No file provided`);
      req.clearCatalogTimeout?.();
      return res.status(400).json({ error: 'Person image is required' });
    }

    const personImageBuffer = req.file.buffer;
    const personImageMime = req.file.mimetype;

    logger.info(`[DETECT_CATALOG] ${requestId} - File received: ${personImageBuffer.length} bytes, mime=${personImageMime}`);
    logger.info(`[DETECT_CATALOG] ${requestId} - Calling decideCatalogSexFromPhoto...`);

    // Make AI decision
    const decision = await decideCatalogSexFromPhoto(personImageBuffer, personImageMime);

    logger.info(`[DETECT_CATALOG] ${requestId} - Decision received: ${JSON.stringify(decision)}`);

    // Log metrics
    logCatalogDecision(requestId, decision);

    const totalTime = Date.now() - startTime;
    logger.info(`[DETECT_CATALOG] ${requestId} - Sending response (totalTime=${totalTime}ms)`);

    req.clearCatalogTimeout?.();

    // Return decision
    if (!res.headersSent) {
      res.json({
        success: true,
        requestId,
        catalog: decision.sex,
        confidence: decision.confidence,
        reason: decision.reason,
        latencyMs: decision.latencyMs,
      });
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error(`[DETECT_CATALOG] ${requestId} - Error after ${totalTime}ms:`, error.message);
    req.clearCatalogTimeout?.();

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to detect catalog',
        details: error.message,
        // Return fallback on error
        catalog: 'female',
        confidence: 0,
        reason: 'fallback_error',
      });
    }
  }
});

// ==================== BATCH TRY-ON ENDPOINTS ====================

/**
 * Start a batch try-on job
 * Generates multiple looks in parallel with quality gating
 */
app.post('/api/try-on-batch', optionalAuth, upload.single('personImage'), async (req, res) => {
  const requestId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const startTime = Date.now();

  logger.info(`[BATCH_API] ${requestId} - Request received`);

  try {
    if (!isBatchReady()) {
      logger.error(`[BATCH_API] ${requestId} - Service not ready`);
      return res.status(503).json({ error: 'Batch service not ready' });
    }

    if (!req.file) {
      logger.warn(`[BATCH_API] ${requestId} - No person image provided`);
      return res.status(400).json({ error: 'Person image is required' });
    }

    // Parse outfits from request body
    let outfits;
    try {
      outfits = JSON.parse(req.body.outfits || '[]');
    } catch (e) {
      logger.warn(`[BATCH_API] ${requestId} - Invalid outfits JSON`);
      return res.status(400).json({ error: 'Invalid outfits data' });
    }

    if (!outfits.length) {
      logger.warn(`[BATCH_API] ${requestId} - No outfits provided`);
      return res.status(400).json({ error: 'At least one outfit is required' });
    }

    const personImageBuffer = req.file.buffer;
    const personImageMime = req.file.mimetype;

    logger.info(`[BATCH_API] ${requestId} - Starting batch job with ${outfits.length} outfits`);
    logger.info(`[BATCH_API] ${requestId} - Person image: ${Math.round(personImageBuffer.length / 1024)}KB, ${personImageMime}`);

    // Start the batch job (returns immediately, processes in background)
    const jobId = await startBatchJob(personImageBuffer, personImageMime, outfits);

    const elapsed = Date.now() - startTime;
    logger.info(`[BATCH_API] ${requestId} - Job started: ${jobId} (${elapsed}ms)`);

    res.json({
      success: true,
      jobId,
      message: 'Batch job started',
      outfitCount: outfits.length,
    });

  } catch (error) {
    logger.error(`[BATCH_API] ${requestId} - Error:`, error.message);
    res.status(500).json({
      error: 'Failed to start batch job',
      details: error.message,
    });
  }
});

/**
 * Get batch job results
 * Poll this endpoint to get approved looks as they become ready
 */
app.get('/api/try-on-batch/:jobId/results', optionalAuth, (req, res) => {
  const { jobId } = req.params;

  logger.info(`[BATCH_API] Results requested for job: ${jobId}`);

  const results = getJobResults(jobId);

  if (!results) {
    logger.warn(`[BATCH_API] Job not found: ${jobId}`);
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(results);
});

// ==================== END BATCH TRY-ON ====================

// ==================== EMAIL LOOK ====================

/**
 * POST /api/email-look
 * Send a saved look to user's email
 */
app.post('/api/email-look', async (req, res) => {
  try {
    const { email, imageBase64, outfitName, outfitDescription } = req.body;

    if (!email || !imageBase64) {
      return res.status(400).json({ error: 'Email and image are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    logger.info(`[EMAIL_LOOK] Sending look to: ${email}`);

    const result = await sendSavedLookEmail(email, imageBase64, outfitName, outfitDescription);

    if (result.success) {
      logger.info(`[EMAIL_LOOK] Successfully sent to: ${email}`);
      res.json({ success: true });
    } else {
      logger.error(`[EMAIL_LOOK] Failed to send: ${result.error}`);
      res.status(500).json({ error: result.error || 'Failed to send email' });
    }
  } catch (error) {
    logger.error(`[EMAIL_LOOK] Exception: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== END EMAIL LOOK ====================

// Stripe: Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    logger.info('[CHECKOUT] ========== CREATING CHECKOUT SESSION ==========');
    logger.info(`[CHECKOUT] Request body: ${JSON.stringify(req.body)}`);

    const { priceId, userId, userEmail, mode = 'subscription' } = req.body;
    logger.info(`[CHECKOUT] Parsed values - priceId: ${priceId}, userId: ${userId}, mode: ${mode}`);

    if (!priceId) {
      logger.warn('[CHECKOUT] ERROR: No priceId provided');
      return res.status(400).json({ error: 'Price ID is required' });
    }

    logger.info('[CHECKOUT] Creating session with priceId:', priceId, 'Mode:', mode);

    // Create Checkout Session
    const sessionConfig = {
      mode: mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/try-on`,
      customer_email: userEmail,
      metadata: {
        userId: userId || 'guest',
        mode: mode,
        priceId: priceId, // Pass priceId to metadata so webhook knows which plan it is
      },
    };

    // Add subscription_data only if mode is subscription
    if (mode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          userId: userId || 'guest',
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // NOTE: Enable "Email customers about successful payments" in Stripe Dashboard > Settings > Emails
    // for automatic receipt emails.

    logger.info('[CHECKOUT] Session created successfully:', session.id);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error('[CHECKOUT] Error creating checkout session:', error.message);
    logger.error('[CHECKOUT] Error type:', error.type);
    logger.error('[CHECKOUT] Status code:', error.statusCode);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// Main endpoint for virtual try-on (accepts file uploads)
// Apply optionalAuth middleware to check JWT if present
// OPTIMIZED: Uses memory storage for faster processing
app.post('/api/try-on', optionalAuth, upload.fields([
  { name: 'personImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), async (req, res) => {
  const startTime = Date.now();
  const requestId = `tryon_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  logger.info(`[TRYON:${requestId}] ========== NEW TRY-ON REQUEST ==========`);
  logger.info(`[TRYON:${requestId}] Request received at ${new Date().toISOString()}`);

  try {
    if (!req.files || !req.files.personImage || !req.files.clothingImage) {
      return res.status(400).json({ error: 'Both person and clothing images are required' });
    }

    const parseTime = Date.now() - startTime;
    logger.info(`[TRYON:${requestId}] [TIMING] Multipart parsing: ${parseTime}ms`);

    // Get buffers directly from memory (no disk I/O)
    const personImageBuffer = req.files.personImage[0].buffer;
    const clothingImageBuffer = req.files.clothingImage[0].buffer;
    const personImageMime = req.files.personImage[0].mimetype;
    const clothingImageMime = req.files.clothingImage[0].mimetype;
    const outfitName = req.body.outfitName || 'Outfit';

    // Log authentication status
    if (req.user) {
      logger.info(`[TRYON:${requestId}] Authenticated user: ${req.user.email}`);
    } else {
      logger.info(`[TRYON:${requestId}] Guest user (unauthenticated)`);
    }

    const personSizeKB = Math.round(personImageBuffer.length / 1024);
    const clothingSizeKB = Math.round(clothingImageBuffer.length / 1024);
    logger.info(`[TRYON:${requestId}] Image sizes: person=${personSizeKB}KB, clothing=${clothingSizeKB}KB`);

    // AUTH DISABLED - Skip credit checks for now
    /*
    // Enforce credits/plan limits for authenticated users
    if (req.user) {
      const creditCheckStart = Date.now();
      const { data: hasCredits, error: creditError } = await supabase.rpc('check_user_credits', {
        user_uuid: req.user.id
      });
      logger.info(`[PERF] Credit check took ${Date.now() - creditCheckStart}ms`);

      if (creditError) {
        logger.error('Error checking user credits:', creditError);
        throw new Error('Failed to verify user credits');
      }

      if (!hasCredits) {
        logger.warn(`[AUTH] User ${req.user.id} attempted try-on without credits/active plan`);
        return res.status(403).json({
          error: 'Insufficient credits or expired plan',
          code: 'NO_CREDITS'
        });
      }

      // Decrement credits (or just log usage for unlimited plans)
      const { error: decrementError } = await supabase.rpc('decrement_user_credits', {
        user_uuid: req.user.id
      });

      if (decrementError) {
        logger.error('Error decrementing user credits:', decrementError);
      }
    }
    */

    // Use Gemini 2.5 Flash Image model for image generation
    const modelInitStart = Date.now();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image'
    });
    logger.info(`[TRYON:${requestId}] [TIMING] Model init: ${Date.now() - modelInitStart}ms`);

    // Convert buffers directly to Gemini parts (no file I/O)
    const prepStart = Date.now();
    const personImagePart = bufferToGenerativePart(personImageBuffer, personImageMime);
    const clothingImagePart = bufferToGenerativePart(clothingImageBuffer, clothingImageMime);
    logger.info(`[TRYON:${requestId}] [TIMING] Image prep (base64): ${Date.now() - prepStart}ms`);

    // Generate image - OPTIMIZED shorter prompt for faster generation
    const generationPrompt = `Virtual try-on: Put the outfit from image 2 onto the person in image 1.

Keep: exact face, skin, hair, pose, background.
Replace: all clothing with the new outfit. Include shoes/accessories if shown.
Fit the outfit naturally to their body. Preserve fabric texture and pattern exactly.
Output: photorealistic fashion photo, ~1000px tall.`;

    logger.info(`[TRYON:${requestId}] [TIMING] Starting Gemini API call...`);
    const geminiStart = Date.now();

    // Timeout after 25 seconds to prevent hung requests
    const GEMINI_TIMEOUT_MS = 25000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), GEMINI_TIMEOUT_MS);
    });

    const generatePromise = model.generateContent([
      generationPrompt,
      personImagePart,
      clothingImagePart
    ]);

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const geminiTime = Date.now() - geminiStart;
    logger.info(`[TRYON:${requestId}] [TIMING] Gemini generateContent: ${geminiTime}ms`);

    const responseStart = Date.now();
    const response = await result.response;
    logger.info(`[TRYON:${requestId}] [TIMING] Response extraction: ${Date.now() - responseStart}ms`);

    // Get the generated image from the response
    const generatedImage = response.candidates[0].content.parts.find(
      part => part.inlineData
    )?.inlineData;

    if (!generatedImage) {
      throw new Error('No image generated in response');
    }

    const originalSizeKB = Math.round(generatedImage.data.length / 1024);
    const originalMimeType = generatedImage.mimeType || 'image/png';

    // Convert to WebP for smaller size (typically 50-70% smaller than PNG)
    let finalImageBase64 = generatedImage.data;
    let finalMimeType = originalMimeType;
    let finalSizeKB = originalSizeKB;

    try {
      const imageBuffer = Buffer.from(generatedImage.data, 'base64');
      const webpBuffer = await sharp(imageBuffer)
        .webp({ quality: 85 })
        .toBuffer();

      finalImageBase64 = webpBuffer.toString('base64');
      finalMimeType = 'image/webp';
      finalSizeKB = Math.round(webpBuffer.length / 1024);

      logger.info(`[TRYON:${requestId}] [TIMING] WebP conversion: ${originalSizeKB}KB → ${finalSizeKB}KB (${Math.round((1 - finalSizeKB/originalSizeKB) * 100)}% smaller)`);
    } catch (webpErr) {
      logger.warn(`[TRYON:${requestId}] WebP conversion failed, using original: ${webpErr.message}`);
    }

    const totalTime = Date.now() - startTime;

    logger.info(`[TRYON:${requestId}] [TIMING] ========== SUMMARY ==========`);
    logger.info(`[TRYON:${requestId}] [TIMING] Total: ${totalTime}ms`);
    logger.info(`[TRYON:${requestId}] [TIMING] Gemini API: ${geminiTime}ms (${Math.round(geminiTime/totalTime*100)}%)`);
    logger.info(`[TRYON:${requestId}] [TIMING] Result size: ${finalSizeKB}KB (was ${originalSizeKB}KB)`);
    logger.info(`[TRYON:${requestId}] [TIMING] ==============================`);

    // RESPOND IMMEDIATELY with base64 - don't wait for storage upload
    res.json({
      success: true,
      image: finalImageBase64,
      mimeType: finalMimeType,
      message: 'Virtual try-on generated successfully'
    });

    // Upload to storage ASYNC (fire and forget) - for future caching/CDN
    const uploadAsync = async () => {
      try {
        const fileName = `${requestId}.webp`;
        const uploadBuffer = Buffer.from(finalImageBase64, 'base64');

        const { error: uploadError } = await supabase.storage
          .from('outfit-images')
          .upload(fileName, uploadBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000', // 1 year cache
            upsert: true
          });

        if (uploadError) {
          logger.warn(`[TRYON:${requestId}] Async upload failed: ${uploadError.message}`);
        } else {
          logger.info(`[TRYON:${requestId}] Async upload complete: ${fileName}`);
        }
      } catch (err) {
        logger.warn(`[TRYON:${requestId}] Async upload exception: ${err.message}`);
      }
    };
    uploadAsync(); // Fire and forget

    // Send email notification (async, don't wait)
    if (req.user && req.user.email) {
      sendOutfitReadyEmail(req.user.email, outfitName, generatedImage.data)
        .catch(err => logger.error('Failed to send email:', err));
    }

  } catch (error) {
    const errorTime = Date.now() - startTime;

    if (error.message === 'GEMINI_TIMEOUT') {
      logger.warn(`[TRYON:${requestId}] Gemini timeout after ${errorTime}ms`);
      return res.status(504).json({
        error: 'Generation taking too long',
        code: 'TIMEOUT',
        details: 'Please try again. If this persists, try a different photo.',
        retryable: true
      });
    }

    logger.error(`[TRYON:${requestId}] Error after ${errorTime}ms:`, error.message);
    res.status(500).json({
      error: 'Failed to process virtual try-on',
      details: error.message,
      retryable: true
    });
  }
});

// Cancel subscription endpoint
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    logger.info('[CANCEL] Processing subscription cancellation...');
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user's subscription from database (active, trialing, past_due, etc.)
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    logger.info('[CANCEL] Found subscriptions:', subscriptions);
    logger.info('[CANCEL] Query error:', subError);

    if (subError || !subscriptions || subscriptions.length === 0) {
      logger.warn('[CANCEL] No subscription record found for user:', userId);

      // Fallback: Check if user has a plan in 'users' table and reset it if necessary
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('plan_type')
        .eq('id', userId)
        .single();

      if (!userError && user && user.plan_type !== 'free') {
        logger.info('[CANCEL] User has plan in users table but no subscription record. Resetting to free.');
        await supabase
          .from('users')
          .update({ plan_type: 'free' })
          .eq('id', userId);

        return res.json({
          success: true,
          message: 'Subscription cancelled (local cleanup)',
          end_date: new Date().toISOString()
        });
      }

      return res.status(404).json({ error: 'No subscription found' });
    }

    // Find the first active or trialing subscription
    const subscription = subscriptions.find(sub =>
      sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
    );

    if (!subscription) {
      logger.warn('[CANCEL] No cancellable subscription found. Statuses:', subscriptions.map(s => s.status));
      return res.status(404).json({
        error: 'No active subscription found',
        details: `Found ${subscriptions.length} subscription(s) but none are active`
      });
    }

    logger.info('[CANCEL] Found subscription:', subscription.subscription_id);
    logger.info('[CANCEL] Cancellation reason:', reason || 'Not provided');

    // Check if it's a day pass (one-time payment)
    if (subscription.plan === 'day_pass') {
      logger.info('[CANCEL] User attempting to cancel day_pass. Marking as cancelled in DB only.');
      // Just update DB, don't call Stripe (as it's not a subscription)
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscription.subscription_id);

      return res.json({
        success: true,
        message: 'Pass cancelled successfully',
        end_date: subscription.end_date
      });
    }

    // Cancel the subscription in Stripe (at period end)
    const cancelledSubscription = await stripe.subscriptions.update(
      subscription.subscription_id,
      {
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: reason || 'not_provided'
        }
      }
    );

    logger.info('[CANCEL] Stripe subscription cancelled at period end:', cancelledSubscription.id);

    // Update subscription status in database
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.subscription_id);

    logger.info('[CANCEL] SUCCESS: Subscription cancelled for user', userId);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      end_date: subscription.end_date
    });
  } catch (error) {
    logger.error('[CANCEL] Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      details: error.message
    });
  }
});

// Delete account endpoint
app.post('/api/delete-account', async (req, res) => {
  try {
    logger.info('[DELETE] Processing account deletion...');
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get all user's subscriptions from database
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subsError && subscriptions && subscriptions.length > 0) {
      logger.info('[DELETE] Found', subscriptions.length, 'subscription(s) to cancel');

      // Cancel all active Stripe subscriptions immediately
      for (const sub of subscriptions) {
        if (sub.status === 'active') {
          try {
            await stripe.subscriptions.cancel(sub.subscription_id);
            logger.info('[DELETE] Cancelled Stripe subscription:', sub.subscription_id);
          } catch (stripeError) {
            logger.error('[DELETE] Error cancelling Stripe subscription:', stripeError.message);
            // Continue with deletion even if Stripe cancellation fails
          }
        }
      }
    }

    // Delete subscriptions from database
    const { error: subsDeleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subsDeleteError) {
      logger.error('[DELETE] Error deleting subscriptions:', subsDeleteError);
    } else {
      logger.info('[DELETE] Deleted subscriptions from database');
    }

    // Delete user data from users table
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      logger.error('[DELETE] Error deleting user data:', userDeleteError);
      throw userDeleteError;
    }
    logger.info('[DELETE] Deleted user data from database');

    // Delete user from Supabase Auth (best effort)
    // Note: This may fail due to database constraints, but data is already cleaned up
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      logger.warn('[DELETE] Note: Auth user deletion skipped (data already cleaned up)');
    } else {
      logger.info('[DELETE] Successfully deleted user from Supabase Auth');
    }

    logger.info('[DELETE] SUCCESS: Account deleted for user', userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('[DELETE] Error deleting account:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error.message
    });
  }
});

// Delete try-on endpoint
app.post('/api/delete-try-on', async (req, res) => {
  try {
    const { userId, tryOnId } = req.body;

    if (!userId || !tryOnId) {
      return res.status(400).json({ error: 'userId and tryOnId are required' });
    }

    logger.info(`[DELETE_TRYON] Request to delete try-on ${tryOnId} for user ${userId}`);

    // Check if item exists and belongs to user
    const { data: item, error: fetchError } = await supabase
      .from('try_on_history')
      .select('id, user_id, result_url')
      .eq('id', tryOnId)
      .single();

    if (fetchError || !item) {
      logger.warn(`[DELETE_TRYON] Item ${tryOnId} not found`);
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.user_id !== userId) {
      logger.warn(`[DELETE_TRYON] Unauthorized deletion attempt. User ${userId} tried to delete item ${tryOnId} belonging to ${item.user_id}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from storage if result_url exists
    if (item.result_url) {
      try {
        // Extract filename from URL
        const urlParts = item.result_url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        const { error: storageError } = await supabase.storage
          .from('outfit-images')
          .remove([fileName]);

        if (storageError) {
          logger.warn(`[DELETE_TRYON] Failed to delete image from storage: ${storageError.message}`);
        } else {
          logger.info(`[DELETE_TRYON] Deleted image ${fileName} from storage`);
        }
      } catch (e) {
        logger.error(`[DELETE_TRYON] Error deleting image from storage: ${e.message}`);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('try_on_history')
      .delete()
      .eq('id', tryOnId);

    if (deleteError) {
      logger.error(`[DELETE_TRYON] Database deletion error: ${deleteError.message}`);
      throw deleteError;
    }

    logger.info(`[DELETE_TRYON] Successfully deleted try-on ${tryOnId}`);
    res.json({ success: true });

  } catch (error) {
    logger.error('[DELETE_TRYON] Error:', error);
    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
});

// TEMPORARY: Admin endpoint to manually update user subscription
// Remove this after webhooks are working properly
app.post('/api/admin/update-subscription', express.json(), async (req, res) => {
  try {
    const { userId, planType } = req.body;

    if (!userId || !planType) {
      return res.status(400).json({ error: 'userId and planType are required' });
    }

    // Update user's plan_type in users table
    const { data, error } = await supabase
      .from('users')
      .update({
        plan_type: planType,
        credits_remaining: planType === 'free' ? 5 : 999999
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`[ADMIN] Manually updated user ${userId} to ${planType} plan`);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('[ADMIN] Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription', details: error.message });
  }
});

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

app.listen(port, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${port}`);
  logger.info(`API endpoint: http://0.0.0.0:${port}/api/try-on`);
  logger.info(`Health check: http://0.0.0.0:${port}/api/health`);
});
