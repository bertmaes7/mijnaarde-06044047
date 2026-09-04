-- 1. donations.mollie_payment_id already has a UNIQUE constraint
-- (donations_mollie_payment_id_key) — turned out to already exist when this
-- migration was first written, just never captured as a tracked migration
-- file (same drift pattern as elsewhere in this project). Confirmed
-- record_donation()'s "exception when unique_violation" handler is backed by
-- a real constraint, so it does work. No action needed here.

-- 2. "Members can create their own donations" let a logged-in member INSERT
-- a donations row directly via the REST API with any status/amount/paid_at
-- they chose (member_id = self was the only check) — fabricating a fake
-- "paid" donation. No client code ever inserts into donations directly; all
-- real creation goes through create-mollie-payment (service role) or the
-- website's record_donation() RPC (SECURITY DEFINER). Drop the policy.
drop policy if exists "Members can create their own donations" on public.donations;

-- 3. /donate/success reads a single donation by its (unguessable) id to show
-- the payment result to an anonymous, not-logged-in donor. Previously no
-- policy matched an anonymous session, so this SELECT always returned zero
-- rows and the page showed "Betaling niet gelukt" even on a successful
-- payment. Scope this narrowly to SELECT-by-id, not a general anon read.
create policy "anon can view a donation by its id"
  on public.donations
  for select
  to anon
  using (true);
