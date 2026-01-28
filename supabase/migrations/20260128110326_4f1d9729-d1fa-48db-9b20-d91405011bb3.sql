-- Add password_change_required column to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS password_change_required boolean NOT NULL DEFAULT false;

-- Add temporary_password column (encrypted, only shown once to admin)
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS temp_password_hash text;