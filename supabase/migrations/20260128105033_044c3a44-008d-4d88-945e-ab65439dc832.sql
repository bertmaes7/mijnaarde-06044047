-- Add is_admin column to members table
ALTER TABLE public.members 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Update handle_new_user function to check is_admin when linking accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_member_id UUID;
  member_is_admin BOOLEAN;
BEGIN
  -- Only attempt to link to existing member if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    SELECT id, is_admin INTO existing_member_id, member_is_admin
    FROM public.members
    WHERE email = NEW.email AND auth_user_id IS NULL;
    
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
$function$;

-- Sync existing admin roles to members.is_admin
UPDATE public.members m
SET is_admin = true
FROM public.user_roles ur
WHERE m.auth_user_id = ur.user_id 
  AND ur.role = 'admin';