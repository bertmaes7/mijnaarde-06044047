-- Create contributions table for annual membership fees
CREATE TABLE public.contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  contribution_year integer NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mollie_payment_id text NULL,
  paid_at timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(member_id, contribution_year)
);

-- Enable RLS
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage contributions"
  ON public.contributions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view their own
CREATE POLICY "Members can view their own contributions"
  ON public.contributions FOR SELECT
  USING (member_id = get_my_member_id());

-- Add contribution_amount to organization settings concept via mailing_assets
-- We'll store it as a mailing_asset with type 'setting' and key 'contribution_amount'

-- Add updated_at trigger
CREATE TRIGGER update_contributions_updated_at
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();