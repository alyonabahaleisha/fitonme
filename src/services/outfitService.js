import { supabase } from '../lib/supabase';

// Get all PUBLISHED outfits (for virtual try-on)
// These are published from the admin panel
export const getAllOutfits = async () => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select(`
        *,
        products (
          product_name,
          product_link,
          processed_image_url,
          category
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert snake_case to camelCase for frontend
    return data.map(outfit => ({
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      imageUrl: outfit.combined_image_url, // Use combined image for try-on
      thumbnailUrl: outfit.combined_image_url, // Same image for thumbnail
      createdAt: outfit.created_at,

      // Include products for "Shop This Look" feature
      products: outfit.products?.map(p => ({
        name: p.product_name,
        link: p.product_link,
        imageUrl: p.processed_image_url,
        category: p.category,
      })) || [],
    }));
  } catch (error) {
    console.error('Error fetching outfits:', error);
    throw error;
  }
};

// Get outfit by ID (with products for "Shop This Look")
export const getOutfitById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select(`
        *,
        products (
          product_name,
          product_link,
          processed_image_url,
          category
        )
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      imageUrl: data.combined_image_url,
      thumbnailUrl: data.combined_image_url,
      createdAt: data.created_at,
      products: data.products?.map(p => ({
        name: p.product_name,
        link: p.product_link,
        imageUrl: p.processed_image_url,
        category: p.category,
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching outfit:', error);
    throw error;
  }
};
