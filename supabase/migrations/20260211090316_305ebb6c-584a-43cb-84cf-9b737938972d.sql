-- Add date_of_birth column to members table
ALTER TABLE public.members
ADD COLUMN date_of_birth date NULL;