-- Voorbereiding fiscaal attest giften: erkenning bij FOD Financiën is in
-- aanvraag en kan terugwerkend gelden voor giften in 2026. Om geen gat in de
-- dekking te laten ontstaan, wordt adres + rijksregisternummer nu al
-- (optioneel) opgevraagd bij nieuwe donaties, in een losstaande tabel.
--
-- Bewust apart van `members` gehouden: een rijksregisternummer heeft in
-- België een eigen wettelijke opslaggrond nodig (Kaderwet RRN), los van de
-- gewone GDPR-basis voor naam/e-mail op `members`. Isoleren voorkomt dat dit
-- veld per ongeluk meegenomen wordt in generieke ledenqueries.
--
-- Nog GEEN attest-generatie/-indiening in deze migratie — enkel dataopslag.
-- Schrijven gebeurt uitsluitend via de service-role (create-mollie-payment),
-- nooit rechtstreeks door de client — vandaar geen anon/member RLS-policy.

create table public.donor_tax_info (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  street text,
  house_number text,
  postal_code text,
  city text,
  country text not null default 'België',
  national_register_number text,
  consent_given_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id)
);

comment on table public.donor_tax_info is
  'Adres + rijksregisternummer van donateurs, voorbereidend op het fiscaal attest giften. Enkel vullen met expliciete toestemming (consent_given_at). Nog niet gebruikt voor attest-uitreiking.';
comment on column public.donor_tax_info.national_register_number is
  'Rijksregisternummer — gevoelig, vereist eigen wettelijke opslaggrond (Kaderwet RRN). Nooit joinen in generieke ledenqueries.';

alter table public.donor_tax_info enable row level security;

create policy "Admins can manage donor tax info"
  on public.donor_tax_info
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create trigger set_donor_tax_info_updated_at
  before update on public.donor_tax_info
  for each row
  execute function public.update_updated_at_column();
