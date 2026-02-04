-- Create inventory items table for annual report
CREATE TABLE public.annual_report_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  category TEXT NOT NULL, -- bezittingen, schulden, rechten, verplichtingen
  type TEXT NOT NULL, -- specific type like 'onroerende_goederen_eigen', 'financiele_schulden', etc.
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.annual_report_inventory ENABLE ROW LEVEL SECURITY;

-- Only admins can manage inventory
CREATE POLICY "Admins can manage inventory" 
ON public.annual_report_inventory 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_inventory_fiscal_year ON public.annual_report_inventory(fiscal_year);

-- Add trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.annual_report_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();