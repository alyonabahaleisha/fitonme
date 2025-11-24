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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// IMPORTANT: Stripe webhook MUST come before express.json() middleware
// because it needs the raw body to verify the signature
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
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
console.log('[STARTUP] Initializing Stripe...');
console.log('[STARTUP] STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('[STARTUP] STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length);
console.log('[STARTUP] STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 130));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
console.log('[STARTUP] Initializing Supabase...');
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
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('[WEBHOOK] Event received:', event.type);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('[WEBHOOK] Checkout session completed:', session.id);
      console.log('[WEBHOOK] Session metadata:', session.metadata);
      console.log('[WEBHOOK] Customer email:', session.customer_email);

      // Update user's subscription in Supabase
      // We stored userId in metadata
      const userId = session.metadata.userId;
      const subscriptionId = session.subscription;

      console.log('[WEBHOOK] userId from metadata:', userId);
      console.log('[WEBHOOK] subscriptionId:', subscriptionId);

      if (!userId || userId === 'guest') {
        console.error('[WEBHOOK] ERROR: Invalid userId - cannot save subscription for guest user');
        console.error('[WEBHOOK] Customer email:', session.customer_email);
        console.error('[WEBHOOK] Please ensure userId is passed when creating checkout session');
        break;
      }

      if (userId && subscriptionId) {
        try {
          console.log('[WEBHOOK] Retrieving subscription from Stripe:', subscriptionId);
          // Retrieve the subscription details from Stripe to get the plan info
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          console.log('[WEBHOOK] Subscription retrieved:', subscription.id);

          const subscriptionData = {
            subscription_id: subscription.id,
            user_id: userId,
            plan: subscription.items.data[0].price.recurring.interval, // 'month' or 'year' or 'week'
            status: subscription.status,
            start_date: new Date(subscription.current_period_start * 1000),
            end_date: new Date(subscription.current_period_end * 1000),
            stripe_customer_id: subscription.customer,
            stripe_price_id: subscription.items.data[0].price.id,
          };

          console.log('[WEBHOOK] Upserting subscription to database:', subscriptionData);
          const { data: subData, error: subError } = await supabase.from('subscriptions').upsert(subscriptionData);

          if (subError) {
            console.error('[WEBHOOK] ERROR saving subscription:', subError);
            throw subError;
          }
          console.log('[WEBHOOK] Subscription saved successfully:', subData);

          // Update user's plan_type in users table
          // Map interval to plan_type: week -> weekly, month -> monthly, year -> annual
          const interval = subscription.items.data[0].price.recurring.interval;
          let planType = 'free';
          if (interval === 'week') planType = 'weekly';
          if (interval === 'month') planType = 'monthly';
          if (interval === 'year') planType = 'annual';

          console.log('[WEBHOOK] Updating user plan_type to:', planType);
          const { error: userError } = await supabase.from('users').update({
            plan_type: planType,
            credits_remaining: 999999 // Unlimited
          }).eq('id', userId);

          if (userError) {
            console.error('[WEBHOOK] ERROR updating user:', userError);
            throw userError;
          }

          console.log('[WEBHOOK] SUCCESS: Updated subscription for user', userId, 'to', planType);
        } catch (err) {
          console.error('[WEBHOOK] ERROR updating subscription in Supabase:', err);
          console.error('[WEBHOOK] Error details:', JSON.stringify(err, null, 2));
        }
      }
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscriptionUpdate = event.data.object;
      console.log('[WEBHOOK] Subscription updated:', subscriptionUpdate.id);

      try {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('subscription_id', subscriptionUpdate.id)
          .single();

        if (existingSub) {
          await supabase.from('subscriptions').upsert({
            subscription_id: subscriptionUpdate.id,
            user_id: existingSub.user_id,
            plan: subscriptionUpdate.items.data[0].price.recurring.interval,
            status: subscriptionUpdate.status,
            start_date: new Date(subscriptionUpdate.current_period_start * 1000),
            end_date: new Date(subscriptionUpdate.current_period_end * 1000),
            stripe_customer_id: subscriptionUpdate.customer,
            stripe_price_id: subscriptionUpdate.items.data[0].price.id,
          });
          console.log('[WEBHOOK] Subscription updated in database');
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling subscription update:', err);
      }
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('[WEBHOOK] Subscription cancelled:', deletedSubscription.id);

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

          console.log('[WEBHOOK] Subscription cancelled in database');
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling subscription cancellation:', err);
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('[WEBHOOK] Payment succeeded:', invoice.id);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('[WEBHOOK] Payment failed:', failedInvoice.id);
      break;

    default:
      console.log('[WEBHOOK] Unhandled event type:', event.type);
  }

  res.json({ received: true });
});

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
    console.log('[CHECKOUT] Creating checkout session...');
    console.log('[CHECKOUT] Request body:', req.body);

    const { priceId, userId, userEmail } = req.body;

    if (!priceId) {
      console.log('[CHECKOUT] ERROR: No priceId provided');
      return res.status(400).json({ error: 'Price ID is required' });
    }

    console.log('[CHECKOUT] Creating session with priceId:', priceId);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/try-on?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/try-on`,
      customer_email: userEmail,
      metadata: {
        userId: userId || 'guest',
      },
      subscription_data: {
        metadata: {
          userId: userId || 'guest',
        },
      },
    });

    console.log('[CHECKOUT] Session created successfully:', session.id);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[CHECKOUT] Error creating checkout session:', error.message);
    console.error('[CHECKOUT] Error type:', error.type);
    console.error('[CHECKOUT] Status code:', error.statusCode);
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

    // Log authentication status
    if (req.user) {
      console.log(`[AUTH] Authenticated try-on request from user: ${req.user.email} (${req.user.id})`);
    } else {
      console.log('[AUTH] Unauthenticated try-on request (guest user)');
    }

    console.log('Processing images...');
    console.log('Person image:', personImagePath);
    console.log('Clothing image:', clothingImagePath);
    console.log('Description:', description);

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

    console.log('Image generated successfully');

    // Clean up uploaded files
    fs.unlinkSync(personImagePath);
    fs.unlinkSync(clothingImagePath);

    res.json({
      success: true,
      image: generatedImage.data,
      mimeType: generatedImage.mimeType,
      message: 'Virtual try-on generated successfully'
    });

  } catch (error) {
    console.error('Error processing try-on:', error);

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

    console.log(`[ADMIN] Manually updated user ${userId} to ${planType} plan`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ADMIN] Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription', details: error.message });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`API endpoint: http://0.0.0.0:${PORT}/api/try-on`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
});
