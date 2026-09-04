-- Fix mismatched income type ("donatie" -> "donation") so the Inkomsten page's
-- type filter/badge correctly recognizes donations created by the Mollie webhook.
UPDATE public.income SET type = 'donation' WHERE type = 'donatie';

-- Track the Mollie transaction fee and resulting net amount per donation, so the
-- gross donation amount can be reconciled against what actually lands in the bank.
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC;
