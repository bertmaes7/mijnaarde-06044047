-- Fix handle_new_user to always try linking by email first, regardless of email_confirmed_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_member_id UUID;
  member_is_admin BOOLEAN;
BEGIN
  -- Always try to link to existing member by email first
  SELECT id, is_admin INTO existing_member_id, member_is_admin
  FROM public.members
  WHERE LOWER(email) = LOWER(NEW.email) AND auth_user_id IS NULL;
  
  IF existing_member_id IS NOT NULL THEN
    -- Link existing member to auth user
    UPDATE public.members
    SET auth_user_id = NEW.id
    WHERE id = existing_member_id;
    
    -- Give the user the 'member' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- If member was marked as admin, also give admin role
    IF member_is_admin THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- No existing member found - only create new member if email is confirmed
  -- This prevents creating orphan records from unverified signups
  IF NEW.email_confirmed_at IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$$;