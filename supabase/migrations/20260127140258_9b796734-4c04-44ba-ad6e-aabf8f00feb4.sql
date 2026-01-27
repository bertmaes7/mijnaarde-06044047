-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add auth_user_id to members table to link auth users to members
ALTER TABLE public.members ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user's member_id
CREATE OR REPLACE FUNCTION public.get_my_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.members WHERE auth_user_id = auth.uid()
$$;

-- RLS policies for user_roles (only admins can manage roles)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update members RLS policies for member self-access
CREATE POLICY "Members can view their own record"
ON public.members
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can update their own record"
ON public.members
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert members"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth_user_id = auth.uid());

CREATE POLICY "Admins can delete members"
ON public.members
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update companies RLS for admin-only access
CREATE POLICY "Admins can manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update income RLS for admin-only access
CREATE POLICY "Admins can manage income"
ON public.income
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Members can view their own income
CREATE POLICY "Members can view their own income"
ON public.income
FOR SELECT
TO authenticated
USING (member_id = public.get_my_member_id());

-- Update expenses RLS for admin-only access
CREATE POLICY "Admins can manage expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Members can view their own expenses
CREATE POLICY "Members can view their own expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (member_id = public.get_my_member_id());

-- Function to create member on signup (called via trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_member_id UUID;
BEGIN
  -- Check if there's an existing member with this email
  SELECT id INTO existing_member_id
  FROM public.members
  WHERE email = NEW.email;
  
  IF existing_member_id IS NOT NULL THEN
    -- Link existing member to auth user
    UPDATE public.members
    SET auth_user_id = NEW.id
    WHERE id = existing_member_id;
  ELSE
    -- Create new member record
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
  END IF;
  
  -- Give new user the 'member' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();