import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Main endpoint for virtual try-on (accepts file uploads)
app.post('/api/try-on', upload.fields([
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
    const generationPrompt = `Create a photorealistic image showing the person from the first photo naturally wearing the clothing items from the second image.
Undress person first then apply clothes from second picture.
Be hyper-specific and detailed:

Use the exact facial features, hair, skin tone, and body proportions from the first image.

Preserve the person’s pose, background, and lighting conditions from the first image.

Overlay or substitute the current outfit with the garments from the second image, matching each item’s fit, style, color, texture, and drape.

Adjust the garment contours to the person’s shape so that items appear naturally fitted — loose, tight, long, or short according to each clothing piece.
if outfit has shoes put them on persons feet.

Ensure realistic lighting consistency and shadows. Clean the room to make it look rich studio remove unnessesary details.

The final result must look like a seamless, professional photograph of the person wearing the new outfit in their original setting.`;

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
