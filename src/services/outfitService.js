import { supabase, uploadBase64Image, STORAGE_BUCKETS } from '../lib/supabase';

// Create a new outfit
export const createOutfit = async (outfitData) => {
  try {
    const { name, description, category, tags, season, imagePreview, thumbnailPreview } = outfitData;

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const imageFileName = `${timestamp}-${randomId}-outfit.png`;
    const thumbnailFileName = `${timestamp}-${randomId}-thumbnail.png`;

    // Upload images to Supabase Storage
    const imageUrl = await uploadBase64Image(imagePreview, STORAGE_BUCKETS.OUTFIT_IMAGES, imageFileName);
    const thumbnailUrl = await uploadBase64Image(thumbnailPreview, STORAGE_BUCKETS.OUTFIT_THUMBNAILS, thumbnailFileName);

    // Insert outfit record into database
    const { data, error } = await supabase
      .from('outfits')
      .insert([
        {
          name,
          description,
          category,
          tags,
          season,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Convert snake_case to camelCase for frontend
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      season: data.season,
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error creating outfit:', error);
    throw error;
  }
};

// Get all outfits
export const getAllOutfits = async () => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert snake_case to camelCase for frontend
    return data.map(outfit => ({
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      category: outfit.category,
      tags: outfit.tags,
      season: outfit.season,
      imageUrl: outfit.image_url,
      thumbnailUrl: outfit.thumbnail_url,
      createdAt: outfit.created_at,
    }));
  } catch (error) {
    console.error('Error fetching outfits:', error);
    throw error;
  }
};

// Get outfit by ID
export const getOutfitById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      season: data.season,
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error fetching outfit:', error);
    throw error;
  }
};

// Delete outfit
export const deleteOutfit = async (id, imageUrl, thumbnailUrl) => {
  try {
    // Extract file names from URLs
    const imageFileName = imageUrl.split('/').pop();
    const thumbnailFileName = thumbnailUrl.split('/').pop();

    // Delete images from storage
    await supabase.storage.from(STORAGE_BUCKETS.OUTFIT_IMAGES).remove([imageFileName]);
    await supabase.storage.from(STORAGE_BUCKETS.OUTFIT_THUMBNAILS).remove([thumbnailFileName]);

    // Delete database record
    const { error } = await supabase
      .from('outfits')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting outfit:', error);
    throw error;
  }
};

// Update outfit
export const updateOutfit = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      season: data.season,
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error updating outfit:', error);
    throw error;
  }
};
