-- Storage policies for outfit-images bucket
-- First, delete any existing policies
DELETE FROM storage.policies WHERE bucket_id = 'outfit-images';

-- Allow public uploads to outfit-images bucket
INSERT INTO storage.policies (bucket_id, name, definition, operation)
VALUES
  ('outfit-images', 'Allow public uploads', '(true)', 'INSERT'),
  ('outfit-images', 'Allow public read', '(true)', 'SELECT'),
  ('outfit-images', 'Allow public delete', '(true)', 'DELETE'),
  ('outfit-images', 'Allow public update', '(true)', 'UPDATE');

-- Storage policies for outfit-thumbnails bucket
-- First, delete any existing policies
DELETE FROM storage.policies WHERE bucket_id = 'outfit-thumbnails';

-- Allow public uploads to outfit-thumbnails bucket
INSERT INTO storage.policies (bucket_id, name, definition, operation)
VALUES
  ('outfit-thumbnails', 'Allow public uploads', '(true)', 'INSERT'),
  ('outfit-thumbnails', 'Allow public read', '(true)', 'SELECT'),
  ('outfit-thumbnails', 'Allow public delete', '(true)', 'DELETE'),
  ('outfit-thumbnails', 'Allow public update', '(true)', 'UPDATE');
