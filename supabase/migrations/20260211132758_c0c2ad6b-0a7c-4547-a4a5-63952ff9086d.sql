
-- Fix 1: Drop the overly permissive member self-update policy
DROP POLICY IF EXISTS "Members can update their own record" ON public.members;

-- Create restricted policy: members can update their own profile but NOT is_admin or auth_user_id
CREATE POLICY "Members can update own profile fields"
ON public.members
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND is_admin = (SELECT m.is_admin FROM public.members m WHERE m.id = id)
  AND auth_user_id = (SELECT m.auth_user_id FROM public.members m WHERE m.id = id)
);

-- Admins can update any member (all fields)
DROP POLICY IF EXISTS "Admins can update any member" ON public.members;
CREATE POLICY "Admins can update any member"
ON public.members
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Lock down user_roles table - only service role should write
DROP POLICY IF EXISTS "Admin users can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Allow users to read their own roles (needed for auth checks)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Role changes must go through edge functions using service_role
