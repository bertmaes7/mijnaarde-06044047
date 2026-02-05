-- Fix the search_path for generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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