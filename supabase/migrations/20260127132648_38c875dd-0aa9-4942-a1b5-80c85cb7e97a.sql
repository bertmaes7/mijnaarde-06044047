-- Add VAT rate column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN vat_rate numeric DEFAULT 21;