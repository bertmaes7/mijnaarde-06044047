-- record_donation() and subscribe_to_newsletter() (both from the
-- mijnaarde-website repo, SECURITY DEFINER RPCs) create a new members row
-- when no matching email exists, but never set member_since — leaving it
-- NULL for anyone who joins via a donation or newsletter signup instead of
-- through the admin app. handle_new_user() already sets member_since :=
-- CURRENT_DATE on its insert; align both functions with that.

CREATE OR REPLACE FUNCTION public.record_donation(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_amount numeric,
  p_currency text,
  p_frequency text,
  p_mollie_payment_id text,
  p_mollie_customer_id text,
  p_status text,
  p_description text DEFAULT NULL::text
)
RETURNS TABLE(already_processed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_member_id public.members.id%type;
begin
  -- Elke betaling is verplicht gekoppeld aan een member (zie
  -- DonationFlow — e-mail, voornaam en naam zijn verplichte velden vóór
  -- Mollie geopend wordt).
  update public.members
  set is_donor = true,
      is_active = true,
      first_name = coalesce(members.first_name, p_first_name),
      last_name = coalesce(members.last_name, p_last_name)
  where email = p_email
  returning id into v_member_id;

  if v_member_id is null then
    insert into public.members (
      email, first_name, last_name, is_donor, is_active, is_active_member, member_since
    )
    values (
      p_email, p_first_name, p_last_name, true, true, false, current_date
    )
    returning id into v_member_id;
  end if;

  begin
    insert into public.donations (
      member_id, amount, currency, status, description,
      frequency, mollie_payment_id, mollie_customer_id, paid_at
    )
    values (
      v_member_id, p_amount, p_currency, p_status, p_description,
      p_frequency, p_mollie_payment_id, p_mollie_customer_id,
      case when p_status = 'paid' then now() else null end
    );
  exception
    when unique_violation then
      -- Al verwerkt bij een eerdere webhook-call voor deze betaling.
      return query select true;
      return;
  end;

  -- Boek de bruto donatie als inkomst zodra ze effectief betaald is, zodat
  -- ze verschijnt in Financieel > Inkomsten / Donaties in de ledenadmin-app.
  if p_status = 'paid' then
    insert into public.income (member_id, amount, type, description, date, notes)
    values (
      v_member_id,
      p_amount,
      'donation',
      coalesce(p_description, 'Donatie via Mollie'),
      current_date,
      'Mollie donatie: ' || p_mollie_payment_id
    );
  end if;

  return query select false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.subscribe_to_newsletter(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  update public.members
  set receives_mail = true,
      is_active = true,
      first_name = coalesce(p_first_name, members.first_name),
      last_name = coalesce(p_last_name, members.last_name),
      phone = coalesce(p_phone, members.phone)
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
