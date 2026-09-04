-- Publieke, niet-gevoelige verzendinfo voor de storefront-winkelmandpagina
-- (mijnaarde-website). shop_settings zelf blijft admin-only — dit geeft
-- enkel shipping_cost/free_shipping_threshold vrij, en enkel als de shop
-- effectief live staat (anders lege rij, consistent met de kill-switch).
create or replace function public.get_shop_shipping_info()
returns table(shipping_cost numeric, free_shipping_threshold numeric)
language sql
stable
security definer
set search_path = public
as $$
  select shipping_cost, free_shipping_threshold
  from public.shop_settings
  where id = true and is_live = true;
$$;

grant execute on function public.get_shop_shipping_info() to anon;
