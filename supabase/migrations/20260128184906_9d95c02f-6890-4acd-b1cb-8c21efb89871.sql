-- Add filter columns to mailings table
ALTER TABLE public.mailings
ADD COLUMN IF NOT EXISTS filter_status text DEFAULT 'all',
ADD COLUMN IF NOT EXISTS filter_company_id text DEFAULT 'all',
ADD COLUMN IF NOT EXISTS filter_city text DEFAULT 'all',
ADD COLUMN IF NOT EXISTS filter_membership_type text DEFAULT 'all';