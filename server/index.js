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
import { sendOutfitReadyEmail } from './services/email.js';
import logger from './utils/logger.js';
import { apiLimiter, strictLimiter } from './middleware/rateLimiter.js';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

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
    'https://www.fitonme.ai'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
// Apply global rate limiter to all requests
app.use(apiLimiter);

// IMPORTANT: Stripe webhook MUST come before express.json() middleware
// because it needs the raw body to verify the signature

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Helper function to convert image to base64
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString('base64'),
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

      logger.info('[WEBHOOK] userId from metadata:', userId);
      logger.info('[WEBHOOK] mode:', mode);
      logger.info('[WEBHOOK] subscriptionId:', subscriptionId);

      if (!userId || userId === 'guest') {
        logger.error('[WEBHOOK] ERROR: Invalid userId - cannot save subscription for guest user');
        // logger.error('[WEBHOOK] Customer email:', session.customer_email);
        logger.error('[WEBHOOK] Please ensure userId is passed when creating checkout session');
        break;
      }

      // Handle One-Time Payment (1-Day Pass)
      if (mode === 'payment') {
        try {
          logger.info('[WEBHOOK] Processing one-time payment for 1-Day Pass');

          // Calculate 24-hour access
          const startDate = new Date().toISOString();
          const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          // Use session ID as pseudo-subscription ID for tracking
          const subscriptionData = {
            subscription_id: session.id, // Use session ID for one-time payments
            user_id: userId,
            plan: 'day_pass',
            status: 'active',
            start_date: startDate,
            end_date: endDate,
            stripe_customer_id: session.customer,
            stripe_price_id: 'price_day_pass', // Placeholder or from session
          };

          logger.info('[WEBHOOK] Saving 1-Day Pass to database:', subscriptionData);
          const { error: subError } = await supabase.from('subscriptions').upsert(subscriptionData);

          if (subError) throw subError;

          // Update user plan_type
          const { error: userError } = await supabase.from('users').update({
            plan_type: 'day_pass',
            credits_remaining: 999999 // Unlimited for 24h
          }).eq('id', userId);

          if (userError) throw userError;

          logger.info('[WEBHOOK] SUCCESS: Activated 1-Day Pass for user', userId);
        } catch (err) {
          logger.error('[WEBHOOK] ERROR processing 1-Day Pass:', err);
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
            credits_remaining: 999999 // Unlimited
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

// Stripe: Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    logger.info('[CHECKOUT] Creating checkout session...');
    // logger.info('[CHECKOUT] Request body:', req.body);

    const { priceId, userId, userEmail, mode = 'subscription' } = req.body;

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
app.post('/api/try-on', optionalAuth, upload.fields([
  { name: 'personImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.personImage || !req.files.clothingImage) {
      return res.status(400).json({ error: 'Both person and clothing images are required' });
    }

    const personImagePath = req.files.personImage[0].path;
    const clothingImagePath = req.files.clothingImage[0].path;
    const personImageMime = req.files.personImage[0].mimetype;
    const clothingImageMime = req.files.clothingImage[0].mimetype;
    const description = req.body.description || '';
    const outfitName = req.body.outfitName || 'Outfit';

    // Log authentication status
    if (req.user) {
      logger.info(`[AUTH] Authenticated try-on request from user: ${req.user.email} (${req.user.id})`);
    } else {
      logger.info('[AUTH] Unauthenticated try-on request (guest user)');
    }

    logger.info('Processing images...');
    logger.info('Person image:', personImagePath);
    logger.info('Clothing image:', clothingImagePath);
    logger.info('Description:', description);

    // Use Gemini 2.5 Flash Image model for image generation
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image'
    });

    const personImagePart = fileToGenerativePart(personImagePath, personImageMime);
    const clothingImagePart = fileToGenerativePart(clothingImagePath, clothingImageMime);

    // Generate image directly with both image inputs
    const generationPrompt = `Generate a photorealistic virtual try-on image.
Base Person: Use the person from the first image. Keep their exact face, skin tone, complexion, hair, body proportions, pose, lighting, and background.
Target Outfit: Use the outfit from the second image.

CRITICAL INSTRUCTIONS:
1. COMPLETE CLOTHING REPLACEMENT: Digitally "undress" the person first. Remove ALL original clothing. The new outfit must be worn directly on the body. No traces of the old clothes should be visible.
2. INCLUDE ACCESSORIES: Ensure that ALL items from the outfit image are applied, including SHOES, JEWELRY, bags, and hats. If the outfit image includes shoes or jewelry, the person MUST be wearing them.
3. PERFECT FIT & LENGTH: The new outfit must fit the person perfectly. Adjust the size to suit their specific body proportions. IMPORTANT: For full-length pants, they MUST be long enough to cover the shoes partially or fully, creating a long, flowing line. Do not crop them at the ankles.
4. EXACT FABRIC & PATTERN: You MUST preserve the exact texture, fabric weight, pattern, and details of the target outfit. It should look exactly like the provided clothing image.
5. MOOD & EXPRESSION: The person should look confident, comfortable, and innerly happy. They should feel good in these clothes.
6. REALISM: The result must be a seamless, high-quality fashion photo. Natural folds, shadows, and interaction are essential.`;

    const result = await model.generateContent([
      generationPrompt,
      personImagePart,
      clothingImagePart
    ]);

    const response = await result.response;

    // Get the generated image from the response
    const generatedImage = response.candidates[0].content.parts.find(
      part => part.inlineData
    )?.inlineData;

    if (!generatedImage) {
      throw new Error('No image generated in response');
    }

    logger.info('Image generated successfully');

    // Clean up uploaded files
    fs.unlinkSync(personImagePath);
    fs.unlinkSync(clothingImagePath);

    res.json({
      success: true,
      image: generatedImage.data,
      mimeType: generatedImage.mimeType,
      message: 'Virtual try-on generated successfully'
    });

    // Send email notification (async, don't wait)
    if (req.user && req.user.email) {
      sendOutfitReadyEmail(req.user.email, outfitName, generatedImage.data)
        .catch(err => logger.error('Failed to send email:', err));
    }

  } catch (error) {
    logger.error('Error processing try-on:', error);

    // Clean up files on error
    if (req.files) {
      if (req.files.personImage) fs.unlinkSync(req.files.personImage[0].path);
      if (req.files.clothingImage) fs.unlinkSync(req.files.clothingImage[0].path);
    }

    res.status(500).json({
      error: 'Failed to process virtual try-on',
      details: error.message
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
      logger.warn('[CANCEL] No subscription found for user:', userId);
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
        credits_remaining: planType === 'free' ? 2 : 999999
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
