import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Storage bucket names
export const STORAGE_BUCKETS = {
  OUTFIT_IMAGES: 'outfit-images',
  OUTFIT_THUMBNAILS: 'outfit-thumbnails',
};

// Helper function to upload image to Supabase Storage
export const uploadImage = async (file, bucket, fileName) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Helper function to upload base64 image
export const uploadBase64Image = async (base64String, bucket, fileName) => {
  try {
    // Convert base64 to blob
    const base64Data = base64String.split(',')[1];
    const mimeType = base64String.match(/data:([^;]+);/)?.[1] || 'image/png';
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw error;
  }
};

// Helper function to delete image from Supabase Storage
export const deleteImage = async (bucket, fileName) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// ============================================
// Authentication Helper Functions
// ============================================

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Sign in with Magic Link (passwordless email)
 */
export const signInWithMagicLink = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in with magic link:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get current user's session
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// ============================================
// User Data Helper Functions
// ============================================

/**
 * Get user data from database
 */
export const getUserData = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Update user data
 */
export const updateUserData = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

/**
 * Update user's plan and credits
 */
export const updateUserPlan = async (userId, planType, credits = 999999) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        plan_type: planType,
        credits_remaining: credits
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user plan:', error);
    throw error;
  }
};

/**
 * Check if user has available credits for try-on
 */
export const checkUserCredits = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('check_user_credits', { user_uuid: userId });

    if (error) throw error;
    return data; // Returns boolean
  } catch (error) {
    console.error('Error checking user credits:', error);
    return false;
  }
};

/**
 * Decrement user credits after try-on
 */
export const decrementUserCredits = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('decrement_user_credits', { user_uuid: userId });

    if (error) throw error;
    return data; // Returns boolean (success)
  } catch (error) {
    console.error('Error decrementing user credits:', error);
    return false;
  }
};

/**
 * Record try-on in history
 */
export const recordTryOn = async (userId, outfitId, photoUrl, resultUrl) => {
  try {
    const { data, error } = await supabase
      .from('try_on_history')
      .insert({
        user_id: userId,
        outfit_id: outfitId,
        photo_url: photoUrl,
        result_url: resultUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording try-on:', error);
    throw error;
  }
};

/**
 * Get user's try-on history
 */
export const getTryOnHistory = async (userId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('try_on_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting try-on history:', error);
    return [];
  }
};

// ============================================
// Subscription Helper Functions
// ============================================

/**
 * Get user's active subscription
 */
export const getActiveSubscription = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  } catch (error) {
    console.error('Error getting active subscription:', error);
    return null;
  }
};

/**
 * Create or update subscription (called by Stripe webhooks)
 */
export const upsertSubscription = async (subscriptionData) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'subscription_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }
};

/**
 * Save outfit to user's favorites
 */
export const saveOutfitToFavorites = async (userId, outfitId) => {
  try {
    // Get current saved outfits
    const userData = await getUserData(userId);
    if (!userData) throw new Error('User not found');

    const savedOutfits = userData.outfits_saved || [];

    // Add outfit if not already saved
    if (!savedOutfits.includes(outfitId)) {
      savedOutfits.push(outfitId);

      const { data, error } = await supabase
        .from('users')
        .update({ outfits_saved: savedOutfits })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    return userData;
  } catch (error) {
    console.error('Error saving outfit to favorites:', error);
    throw error;
  }
};

/**
 * Remove outfit from user's favorites
 */
export const removeOutfitFromFavorites = async (userId, outfitId) => {
  try {
    // Get current saved outfits
    const userData = await getUserData(userId);
    if (!userData) throw new Error('User not found');

    const savedOutfits = (userData.outfits_saved || []).filter(id => id !== outfitId);

    const { data, error } = await supabase
      .from('users')
      .update({ outfits_saved: savedOutfits })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error removing outfit from favorites:', error);
    throw error;
  }
};
