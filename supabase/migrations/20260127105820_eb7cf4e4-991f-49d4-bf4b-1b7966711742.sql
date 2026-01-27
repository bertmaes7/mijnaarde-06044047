-- Add supplier field to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_supplier BOOLEAN DEFAULT false;