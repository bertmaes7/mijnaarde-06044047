-- Add bank account field to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- Add extra fields to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enterprise_number TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat_number TEXT;