-- Create storage bucket for mailing assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('mailing-assets', 'mailing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Mailing assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'mailing-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload mailing assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mailing-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update mailing assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mailing-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete mailing assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'mailing-assets' AND auth.role() = 'authenticated');