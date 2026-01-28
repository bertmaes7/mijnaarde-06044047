-- Tighten mailing-assets storage policies to admin-only for modifications
-- The bucket must remain public for email clients to render images

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload mailing assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their uploads" ON storage.objects;

-- Create admin-only policies for modifications
CREATE POLICY "Admins can upload mailing assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mailing-assets' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update mailing assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mailing-assets' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete mailing assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mailing-assets' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);