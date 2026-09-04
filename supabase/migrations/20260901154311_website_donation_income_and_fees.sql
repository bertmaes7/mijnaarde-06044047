-- The mijnaarde-website app (separate repo, shared database) records donations
-- via the record_donation() RPC, but never booked the matching gross income
-- line, and had no way to record the Mollie fee. This extends record_donation
-- to also insert an income row for paid donations, and adds record_donation_fee()
-- for the async Mollie Balance Transactions fee lookup (mirrors the fee/expense
-- reconciliation already wired up in this repo's mollie-webhook edge function).

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
    insert into public.members (email, first_name, last_name, is_donor, is_active, is_active_member)
    values (p_email, p_first_name, p_last_name, true, true, false)
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

CREATE OR REPLACE FUNCTION public.record_donation_fee(
  p_mollie_payment_id text,
  p_fee_amount numeric,
  p_net_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_donation_id public.donations.id%type;
  v_already_booked boolean;
begin
  select id, (fee_amount is not null)
    into v_donation_id, v_already_booked
  from public.donations
  where mollie_payment_id = p_mollie_payment_id;

  if v_donation_id is null or v_already_booked then
    return;
  end if;

  update public.donations
  set fee_amount = p_fee_amount,
      net_amount = p_net_amount
  where id = v_donation_id;

  if p_fee_amount > 0 then
    insert into public.expenses (description, amount, date, type, notes)
    values (
      'Mollie transactiekosten',
      p_fee_amount,
      current_date,
      'other',
      'Mollie kosten - donatie ' || p_mollie_payment_id
    );
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.record_donation_fee(text, numeric, numeric) TO anon;
