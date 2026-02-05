-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  invoice_sequence INTEGER NOT NULL,
  
  -- Customer info (either member or company)
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Invoice details
  description TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Status: draft, sent, paid, overdue
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Amounts
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 21,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment tracking
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Reminders
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  -- PDF storage
  pdf_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure at least one customer type is set
  CONSTRAINT invoice_has_customer CHECK (member_id IS NOT NULL OR company_id IS NOT NULL)
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 21,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Admins can manage invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view their own invoices"
ON public.invoices
FOR SELECT
USING (member_id = get_my_member_id());

-- RLS policies for invoice items
CREATE POLICY "Admins can manage invoice items"
ON public.invoice_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view their own invoice items"
ON public.invoice_items
FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM public.invoices WHERE member_id = get_my_member_id()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_sequence INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(invoice_sequence), 0) + 1 INTO next_sequence
  FROM public.invoices
  WHERE invoice_year = p_year;
  
  -- Format: YYYY-001, YYYY-002, etc.
  invoice_num := p_year::TEXT || '-' || LPAD(next_sequence::TEXT, 3, '0');
  
  RETURN invoice_num;
END;
$$;

-- Create index for performance
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_member_id ON public.invoices(member_id);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_invoice_year ON public.invoices(invoice_year);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);