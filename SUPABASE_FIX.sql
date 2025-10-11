-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Allow public read access" ON outfits;
DROP POLICY IF EXISTS "Allow public insert" ON outfits;
DROP POLICY IF EXISTS "Allow authenticated insert" ON outfits;
DROP POLICY IF EXISTS "Allow anonymous insert" ON outfits;
DROP POLICY IF EXISTS "Allow anonymous update" ON outfits;
DROP POLICY IF EXISTS "Allow anonymous delete" ON outfits;

-- Create fresh policies that allow public access
CREATE POLICY "Enable read access for all users" ON outfits
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for all users" ON outfits
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON outfits
  FOR UPDATE
  USING (true);

CREATE POLICY "Enable delete for all users" ON outfits
  FOR DELETE
  USING (true);
