import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

export const initGemini = (apiKey) => {
  if (!apiKey) {
    console.warn('Gemini API key not provided. AI features will be disabled.');
    return;
  }
  genAI = new GoogleGenerativeAI(apiKey);
};

export const getOutfitRecommendations = async (outfitStyle, occasion = 'casual', season = 'all') => {
  if (!genAI) {
    console.warn('Gemini not initialized. Returning empty recommendations.');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze this outfit style: "${outfitStyle}".
    Suggest 3 similar outfit combinations for ${occasion} occasions during ${season} season.
    Return ONLY a JSON array with this structure:
    [{"name": "Outfit Name", "description": "Brief description", "tags": ["tag1", "tag2"]}]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Error getting outfit recommendations:', error);
    return [];
  }
};

export const analyzeOutfitStyle = async (imageBase64) => {
  if (!genAI) {
    return { style: 'casual', tags: ['everyday'], description: 'Casual outfit' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this outfit image and return a JSON object with:
    {"style": "style category", "tags": ["tag1", "tag2", "tag3"], "description": "brief description"}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64.split(',')[1]
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { style: 'casual', tags: ['everyday'], description: 'Casual outfit' };
  } catch (error) {
    console.error('Error analyzing outfit:', error);
    return { style: 'casual', tags: ['everyday'], description: 'Casual outfit' };
  }
};
