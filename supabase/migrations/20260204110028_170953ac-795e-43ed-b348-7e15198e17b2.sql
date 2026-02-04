-- Add category column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN category text DEFAULT 'overig';

-- Add a comment to document the expected values
COMMENT ON COLUMN public.expenses.category IS 'Expense category: bankkosten, kantoormateriaal, verzekeringen, huur, nutsvoorzieningen, reiskosten, representatiekosten, abonnementen, professionele_diensten, overig';