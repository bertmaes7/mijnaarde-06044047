-- =====================================================
-- SECURITY FIX: Remove all public access policies
-- =====================================================

-- 1. DROP PUBLIC POLICIES ON EXPENSES TABLE
DROP POLICY IF EXISTS "Allow public read access on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public insert on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public update on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow public delete on expenses" ON public.expenses;

-- 2. DROP PUBLIC POLICIES ON INCOME TABLE
DROP POLICY IF EXISTS "Allow public read access on income" ON public.income;
DROP POLICY IF EXISTS "Allow public insert on income" ON public.income;
DROP POLICY IF EXISTS "Allow public update on income" ON public.income;
DROP POLICY IF EXISTS "Allow public delete on income" ON public.income;

-- 3. DROP PUBLIC POLICIES ON COMPANIES TABLE
DROP POLICY IF EXISTS "Allow public read access on companies" ON public.companies;
DROP POLICY IF EXISTS "Allow public insert on companies" ON public.companies;
DROP POLICY IF EXISTS "Allow public update on companies" ON public.companies;
DROP POLICY IF EXISTS "Allow public delete on companies" ON public.companies;

-- 4. DROP PUBLIC POLICIES ON MEMBERS TABLE
DROP POLICY IF EXISTS "Allow public read access on members" ON public.members;
DROP POLICY IF EXISTS "Allow public insert on members" ON public.members;
DROP POLICY IF EXISTS "Allow public update on members" ON public.members;
DROP POLICY IF EXISTS "Allow public delete on members" ON public.members;

-- 5. FIX RECEIPTS STORAGE BUCKET POLICIES
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Receipts are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete receipts" ON storage.objects;

-- Create secure storage policies (only if they don't exist)
DO $$
BEGIN
  -- Authenticated users can view receipts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view receipts' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can view receipts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'receipts');
  END IF;

  -- Admins can upload receipts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can upload receipts' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can upload receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Admins can update receipts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update receipts' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can update receipts"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Admins can delete receipts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete receipts' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can delete receipts"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 6. FIX HANDLE_NEW_USER FUNCTION TO PREVENT ACCOUNT TAKEOVER
-- Only link to existing member if email is confirmed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_member_id UUID;
BEGIN
  -- Only attempt to link to existing member if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    SELECT id INTO existing_member_id
    FROM public.members
    WHERE email = NEW.email AND auth_user_id IS NULL;
    
    IF existing_member_id IS NOT NULL THEN
      -- Link existing member to auth user (only if not already linked)
      UPDATE public.members
      SET auth_user_id = NEW.id
      WHERE id = existing_member_id;
      
      -- Give the user the 'member' role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'member')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RETURN NEW;
    END IF;
  END IF;
  
  -- Create new member record for unconfirmed emails or when no existing member found
  INSERT INTO public.members (
    auth_user_id,
    first_name,
    last_name,
    email,
    is_active,
    member_since
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nieuw'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Lid'),
    NEW.email,
    true,
    CURRENT_DATE
  );
  
  -- Give new user the 'member' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Add admin-only policies for companies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage companies' AND tablename = 'companies'
  ) THEN
    CREATE POLICY "Admins can manage companies"
    ON public.companies FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  -- Allow authenticated users to read companies (for dropdowns etc)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view companies' AND tablename = 'companies'
  ) THEN
    CREATE POLICY "Authenticated users can view companies"
    ON public.companies FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;