-- ============================================================================
-- CircuLink: Supabase Storage Buckets & Policies
-- IDEMPOTENT: safe to run multiple times
-- ============================================================================

-- Create storage bucket for listing photos (skip if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Authenticated users can upload listing photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view listing photos (public bucket)
DROP POLICY IF EXISTS "Anyone can view listing photos" ON storage.objects;
CREATE POLICY "Anyone can view listing photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listings');

-- Allow factory owners to delete their own photos
DROP POLICY IF EXISTS "Factory owners can delete their photos" ON storage.objects;
CREATE POLICY "Factory owners can delete their photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = 'listing_photos'
  AND auth.uid() IS NOT NULL
);
