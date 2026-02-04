-- Create budget table for storing budget items per fiscal year
CREATE TABLE public.budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('income', 'expenses', 'assets', 'liabilities')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  realized_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can manage budget" 
ON public.budget 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_budget_updated_at
BEFORE UPDATE ON public.budget
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries by fiscal year
CREATE INDEX idx_budget_fiscal_year ON public.budget(fiscal_year);