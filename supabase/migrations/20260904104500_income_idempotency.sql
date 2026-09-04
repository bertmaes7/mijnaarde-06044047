-- income had no way to detect a duplicate Mollie webhook call (mollie-webhook
-- checked the free-text `notes` column, which is a race condition;
-- contribution-webhook did not check at all). Mollie explicitly retries
-- webhooks, so both could double-book income on retry.
alter table public.income
  add column if not exists mollie_payment_id text;

create unique index if not exists income_mollie_payment_id_unique
  on public.income (mollie_payment_id)
  where mollie_payment_id is not null;
