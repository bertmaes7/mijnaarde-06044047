-- subscribe_to_newsletter() let the submitted form values win over an
-- existing member's name/phone (coalesce(p_first_name, members.first_name)).
-- Since voornaam/naam are required fields on the public, unauthenticated
-- newsletter form, anyone who knows an existing member's email address
-- could silently overwrite that member's real name/phone in the shared
-- members table just by submitting the form with that email. Existing data
-- should win — only fill in a field if it's still null, matching the same
-- (correct) pattern already used in record_donation().
create or replace function public.subscribe_to_newsletter(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.members
  set receives_mail = true,
      is_active = true,
      first_name = coalesce(members.first_name, p_first_name),
      last_name = coalesce(members.last_name, p_last_name),
      phone = coalesce(members.phone, p_phone)
      -- is_active_member wordt hier bewust NIET aangeraakt.
  where email = p_email;

  if not found then
    insert into public.members (
      email, first_name, last_name, phone,
      receives_mail, is_active, is_active_member, member_since
    )
    values (
      p_email, p_first_name, p_last_name, p_phone,
      true, true, false, current_date
    );
  end if;
end;
$function$;
