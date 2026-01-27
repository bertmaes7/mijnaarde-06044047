-- Make the profile-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'profile-photos';

-- Keep existing authenticated policies for viewing, uploading
-- Update the delete/update policies to be owner-scoped

DROP POLICY IF EXISTS "Authenticated users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;

-- Users can update their own photos OR admins can update any
CREATE POLICY "Users can update own photos or admins"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

-- Users can delete their own photos OR admins can delete any
CREATE POLICY "Users can delete own photos or admins"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));