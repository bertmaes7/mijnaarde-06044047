-- check_member_exists gaf tot nu toe enkel naam terug voor een bekend
-- e-mailadres (gebruikt door zowel de donatie- als de webshop-checkoutflow
-- op mijnaarde-website, anoniem aanroepbaar). Uitgebreid met adresvelden
-- zodat de webshop-checkout het gekende adres van een bestaand lid kan
-- voorinvullen i.p.v. het opnieuw te laten intypen.
--
-- Bewuste afweging: dit vergroot wat een anonieme aanvraag met een gegokt/
-- gekend e-mailadres kan achterhalen (adres, niet enkel naam) — zelfde
-- vertrouwensmodel als al bestond voor de naam, nu uitgebreid tot adres.
-- Return-type wijzigt (extra kolommen), dus eerst droppen.
drop function public.check_member_exists(text);

create function public.check_member_exists(p_email text)
returns table(
  exists_already boolean,
  first_name text,
  last_name text,
  address text,
  postal_code text,
  city text,
  country text
)
language sql
stable
security definer
set search_path = 'public'
as $function$
  select
    (m.id is not null) as exists_already,
    m.first_name,
    m.last_name,
    m.address,
    m.postal_code,
    m.city,
    m.country
  from (select 1) as dummy
  left join public.members m on m.email = p_email
  limit 1;
$function$;

grant execute on function public.check_member_exists(text) to anon;
