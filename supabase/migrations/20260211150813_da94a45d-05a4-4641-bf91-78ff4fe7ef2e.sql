-- Fix the buggy RLS policy for member self-update
DROP POLICY "Members can update own profile fields" ON public.members;

CREATE POLICY "Members can update own profile fields"
ON public.members
FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND is_admin = (SELECT m.is_admin FROM public.members m WHERE m.id = members.id)
  AND auth_user_id = (SELECT m.auth_user_id FROM public.members m WHERE m.id = members.id)
);