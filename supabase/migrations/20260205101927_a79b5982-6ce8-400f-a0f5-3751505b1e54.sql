-- Create donations table to track all donations
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  mollie_payment_id TEXT,
  mollie_status TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all donations"
ON public.donations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view their own donations"
ON public.donations
FOR SELECT
USING (member_id = get_my_member_id());

CREATE POLICY "Members can create their own donations"
ON public.donations
FOR INSERT
WITH CHECK (member_id = get_my_member_id());

-- Create trigger for updated_at
CREATE TRIGGER update_donations_updated_at
BEFORE UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();