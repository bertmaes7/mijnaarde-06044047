-- adjust_stock heeft al een interne rolcheck (service_role of admin), maar
-- de Postgres-default geeft EXECUTE ook aan PUBLIC (dus anon) bij het
-- aanmaken van een functie. Verwijder dat expliciet — defense in depth,
-- zodat de enige laag niet de interne check alleen is.
revoke execute on function public.adjust_stock(uuid, integer, text, uuid) from public;
revoke execute on function public.adjust_stock(uuid, integer, text, uuid) from anon;
grant execute on function public.adjust_stock(uuid, integer, text, uuid) to authenticated, service_role;
