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

    // Custom sort: Evening and Date Night first
    data.sort((a, b) => {
      const priority = ['evening', 'date night'];
      const catA = (a.category || '').toLowerCase();
      const catB = (b.category || '').toLowerCase();

      const aIsPriority = priority.some(p => catA.includes(p));
      const bIsPriority = priority.some(p => catB.includes(p));

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0; // Preserve existing order (created_at) for others
    });

    // Convert snake_case to camelCase for frontend
    return data.map(outfit => ({
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      imageUrl: outfit.combined_image_url, // Use combined image for try-on
      thumbnailUrl: outfit.combined_image_url, // Same image for thumbnail
      createdAt: outfit.created_at,
      gender: outfit.gender || 'woman', // man or woman
      category: outfit.category || 'Casual', // outfit category for filtering

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
      gender: data.gender || 'woman', // man or woman
      category: data.category || 'Casual', // outfit category for filtering
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

// Get multiple outfits by IDs (for Closet view)
export const getOutfitsByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

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
      .in('id', ids)
      .eq('is_published', true);

    if (error) throw error;

    return data.map(outfit => ({
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      imageUrl: outfit.combined_image_url,
      thumbnailUrl: outfit.combined_image_url,
      createdAt: outfit.created_at,
      gender: outfit.gender || 'woman',
      category: outfit.category || 'Casual',
      products: outfit.products?.map(p => ({
        name: p.product_name,
        link: p.product_link,
        imageUrl: p.processed_image_url,
        category: p.category,
      })) || [],
    }));
  } catch (error) {
    console.error('Error fetching outfits by IDs:', error);
    throw error;
  }
};
