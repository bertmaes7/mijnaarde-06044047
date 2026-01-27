-- Add social media fields to members table
ALTER TABLE public.members
ADD COLUMN facebook_url text,
ADD COLUMN linkedin_url text,
ADD COLUMN instagram_url text,
ADD COLUMN tiktok_url text;