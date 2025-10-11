# Supabase Setup Guide

This guide will help you set up Supabase for storing outfit data and images.

## 1. Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up (free tier is sufficient)
3. Create a new project
   - Project name: `godlovesme-ai` (or your preferred name)
   - Database password: Generate a strong password
   - Region: Choose closest to your users
   - Wait for the project to be created (~2 minutes)

## 2. Create Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste this SQL:

```sql
-- Create outfits table
CREATE TABLE outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  season TEXT DEFAULT 'all',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON outfits
  FOR SELECT
  TO anon
  USING (true);

-- Create policy to allow authenticated insert
CREATE POLICY "Allow authenticated insert" ON outfits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated update
CREATE POLICY "Allow authenticated update" ON outfits
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policy to allow authenticated delete
CREATE POLICY "Allow authenticated delete" ON outfits
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_outfits_category ON outfits(category);
CREATE INDEX idx_outfits_season ON outfits(season);
CREATE INDEX idx_outfits_created_at ON outfits(created_at DESC);
```

4. Click **Run** to execute the SQL

## 3. Create Storage Buckets

1. In your Supabase dashboard, go to **Storage**
2. Create two new buckets:

### Bucket 1: outfit-images
- Click **New Bucket**
- Name: `outfit-images`
- Public bucket: **Yes** (enable public access)
- Click **Create Bucket**

### Bucket 2: outfit-thumbnails
- Click **New Bucket**
- Name: `outfit-thumbnails`
- Public bucket: **Yes** (enable public access)
- Click **Create Bucket**

## 4. Configure Storage Policies

For each bucket (outfit-images and outfit-thumbnails):

1. Click on the bucket name
2. Go to **Policies** tab
3. Click **New Policy**
4. Select **Get started quickly** → **Allow public read access**
5. Click **Review** → **Save policy**
6. Click **New Policy** again
7. Select **Get started quickly** → **Allow authenticated uploads**
8. Click **Review** → **Save policy**

## 5. Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## 6. Add Credentials to Your App

1. In your project root, create or update `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Existing Gemini API Key
GEMINI_API_KEY=your-gemini-key-here
```

2. Replace the placeholder values with your actual Supabase credentials

## 7. Verify Setup

Run your app and try uploading an outfit through the Admin panel. You should see:
- Outfit data saved in the `outfits` table (check in Supabase Dashboard → Table Editor)
- Images uploaded to storage buckets (check in Supabase Dashboard → Storage)

## Database Schema

```
outfits
├── id (UUID, Primary Key)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── category (TEXT, NOT NULL)
├── tags (TEXT[])
├── season (TEXT)
├── image_url (TEXT, NOT NULL)
├── thumbnail_url (TEXT, NOT NULL)
└── created_at (TIMESTAMP)
```

## Storage Buckets

- `outfit-images`: Full-size outfit images (PNG/JPG)
- `outfit-thumbnails`: Optimized thumbnails for carousel

## Security Notes

- Row Level Security (RLS) is enabled
- Public read access for browsing outfits
- Authenticated access required for create/update/delete
- Storage buckets allow public read, authenticated write

## Troubleshooting

**Error: "Failed to fetch"**
- Check your VITE_SUPABASE_URL is correct
- Ensure you're using the Project URL, not the API URL

**Error: "Invalid API key"**
- Verify VITE_SUPABASE_ANON_KEY is the anon/public key
- Don't use the service_role key (it's secret)

**Images not uploading**
- Check storage buckets are public
- Verify storage policies are created correctly
- Check browser console for CORS errors

**Data not saving**
- Verify the outfits table was created
- Check RLS policies are in place
- Look at Supabase Dashboard → Logs for errors
