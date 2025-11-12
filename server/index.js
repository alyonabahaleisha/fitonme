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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to convert image to base64
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString('base64'),
      mimeType
    }
  };
}

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'FitOnMe API Server is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Stripe: Create checkout session
app.post('/api/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { priceId, userId, userEmail } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

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
      success_url: `${process.env.VITE_API_URL || 'http://localhost:5173'}/try-on?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_API_URL || 'http://localhost:5173'}/try-on`,
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

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// Stripe: Webhook endpoint for subscription events
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
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      // TODO: Update user's subscription in Supabase
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id);
      // TODO: Update subscription in Supabase
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('Subscription cancelled:', deletedSubscription.id);
      // TODO: Mark subscription as cancelled in Supabase
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Payment succeeded:', invoice.id);
      // TODO: Grant/extend access
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('Payment failed:', failedInvoice.id);
      // TODO: Handle failed payment
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
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
    const fitDescription = description ? `\n- The clothing should fit ${description}` : '';
    const generationPrompt = `Generate a photorealistic virtual try-on image using the person from the first photo as the base and the outfit from the second image.

Detailed instructions:

Use the exact facial features, skin tone, hair, and body proportions from the first image.

undress person first, and then apply outfit on naked body. so nothing out old clothes is left.
Keep the same pose, lighting, and background from the first image.

Perform precise body and clothing segmentation: treat the person’s figure as a neutral base layer (remove or ignore any existing garments only for segmentation purposes, not to expose the body).

Apply the outfit from the second image directly to the person’s contours — respecting each item’s natural fit (loose, tight, cropped, long, etc.), texture, and fabric drape.

Maintain realistic fabric interaction, light behavior, and natural shadowing.

The result should look like a professional fashion photo of the same person wearing the new clothes naturally in their original setting.`;

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`API endpoint: http://0.0.0.0:${PORT}/api/try-on`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
});
