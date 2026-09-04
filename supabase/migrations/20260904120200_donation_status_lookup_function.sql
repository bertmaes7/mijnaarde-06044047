-- Fix: "anon can view a donation by its id" (added in
-- 20260904105500_donations_idempotency_and_rls.sql) used `USING (true)` on
-- SELECT for the anon role. RLS has no concept of "the id the client asked
-- for" — that policy actually let anyone with the public anon key run
-- `SELECT * FROM donations` and read every row (member_id, amount, status
-- of every donor), not just the one donation /donate/success is meant to
-- confirm. Drop it.
drop policy if exists "anon can view a donation by its id" on public.donations;

-- A plain "public columns" view (the companies_public pattern) doesn't fix
-- this: a GRANT is relation-wide, so anon could still `select * from
-- donations_public` with no id filter and list every donation's
-- status/amount. What /donate/success actually needs is "look up the one
-- donation whose id you already have", which only a parameterised
-- SECURITY DEFINER function can enforce — it returns a row only for the
-- exact id passed in, never a listing. Mirrors record_donation()'s
-- SECURITY DEFINER pattern used by the website's donation flow.
create or replace function public.get_donation_status(p_id uuid)
returns table (id uuid, status text, amount numeric, paid_at timestamptz)
language sql
security definer
set search_path to 'public'
as $$
  select d.id, d.status, d.amount, d.paid_at
  from public.donations d
  where d.id = p_id;
$$;

comment on function public.get_donation_status(uuid) is
  'Anonymous /donate/success confirmation lookup. Returns only non-sensitive columns (no member_id) for the single donation id passed in — never a listing.';

grant execute on function public.get_donation_status(uuid) to anon;
