-- Webshop — Fase 1: schema + RLS + ondersteunende functies.
--
-- Niets hiervan is voor gewone bezoekers zichtbaar: het beheer (producten,
-- categorieën, voorraad, bestellingen) zit sowieso achter de bestaande
-- admin-auth, en de publieke SELECT-policies op products/product_categories/
-- product_images zijn bovenop is_published ALTIJD ook gegated door
-- shop_is_live() — een expliciete kill-switch in shop_settings die default
-- op false staat. Zolang niemand die omzet, is er geen publiek pad naar deze
-- tabellen, ook niet als een storefront per ongeluk te vroeg zou deployen.
--
-- Belangrijke les uit de architectuur-review (zie migratie
-- 20260904105500_donations_idempotency_and_rls.sql, policy "anon can view a
-- donation by its id" met USING (true)): orders bevatten volledige
-- leveringsadressen, dus krijgen ze BEWUST GEEN anon-SELECT-policy, ook niet
-- "scoped op id". Gastbestellingen worden bevestigd via de response van de
-- create-shop-payment/shop-webhook edge functions (service-role), nooit via
-- directe tabeltoegang. Enkel ingelogde leden zien hun eigen orders
-- (member_id = get_my_member_id()), net als bij invoices.

-- ── shop_settings: singleton kill-switch + verzendinstellingen ──────────
create table public.shop_settings (
  id boolean primary key default true,
  is_live boolean not null default false,
  shipping_cost numeric not null default 0,
  free_shipping_threshold numeric,
  updated_at timestamptz not null default now(),
  constraint shop_settings_singleton check (id)
);

insert into public.shop_settings (id) values (true);

alter table public.shop_settings enable row level security;

create policy "Admins can manage shop settings"
  on public.shop_settings
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create trigger set_shop_settings_updated_at
  before update on public.shop_settings
  for each row
  execute function public.update_updated_at_column();

-- SECURITY DEFINER zodat dit ook bruikbaar is binnen RLS-policies zonder dat
-- anon rechtstreeks toegang tot shop_settings nodig heeft.
create or replace function public.shop_is_live()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_live from public.shop_settings limit 1), false);
$$;

-- ── Productcatalogus ─────────────────────────────────────────────────────
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric not null default 0,
  vat_rate numeric not null default 21,
  sku text,
  stock_quantity integer not null default 0,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_stock_quantity_non_negative check (stock_quantity >= 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_products_category_id on public.products(category_id);
create index idx_products_is_published on public.products(is_published);
create index idx_product_images_product_id on public.product_images(product_id);

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "Admins can manage product categories"
  on public.product_categories for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Published categories are publicly visible"
  on public.product_categories for select
  using (is_active and shop_is_live());

create policy "Admins can manage products"
  on public.products for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Published products are publicly visible"
  on public.products for select
  using (is_published and is_active and shop_is_live());

create policy "Admins can manage product images"
  on public.product_images for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Images of published products are publicly visible"
  on public.product_images for select
  using (
    shop_is_live()
    and exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.is_published and p.is_active
    )
  );

create trigger set_product_categories_updated_at
  before update on public.product_categories
  for each row execute function public.update_updated_at_column();

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

-- ── Orders ───────────────────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  order_year integer not null default extract(year from current_date)::integer,
  order_sequence integer not null,

  member_id uuid references public.members(id) on delete set null,

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'fulfilled')),

  shipping_street text,
  shipping_house_number text,
  shipping_postal_code text,
  shipping_city text,
  shipping_country text not null default 'België',

  subtotal numeric not null default 0,
  shipping_cost numeric not null default 0,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'EUR',

  mollie_payment_id text unique,
  mollie_status text,
  paid_at timestamptz,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  -- Snapshot van naam/prijs op besteltijd — latere productwijzigingen mogen
  -- bestaande bestellingen niet met terugwerkende kracht veranderen.
  product_name text not null,
  unit_price numeric not null default 0,
  vat_rate numeric not null default 21,
  quantity integer not null default 1 check (quantity > 0),
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create index idx_orders_member_id on public.orders(member_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_order_year on public.orders(order_year);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Admins can manage orders"
  on public.orders for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Members can view their own orders"
  on public.orders for select
  using (member_id = get_my_member_id());

create policy "Admins can manage order items"
  on public.order_items for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Members can view their own order items"
  on public.order_items for select
  using (
    order_id in (select id from public.orders where member_id = get_my_member_id())
  );

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

create or replace function public.generate_order_number(p_year integer)
returns text
language plpgsql
set search_path = public
as $$
declare
  next_sequence integer;
begin
  select coalesce(max(order_sequence), 0) + 1 into next_sequence
  from public.orders
  where order_year = p_year;

  return p_year::text || '-B' || lpad(next_sequence::text, 4, '0');
end;
$$;

-- ── Voorraad ─────────────────────────────────────────────────────────────
-- Hybride model (architectuur-review): products.stock_quantity is de bron
-- van waarheid voor snelle reads, stock_movements is het auditlog. Beide
-- worden enkel via adjust_stock() gewijzigd, atomisch, met een guard tegen
-- oversell (WHERE stock_quantity + delta >= 0).
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('restock', 'sale', 'correction', 'return')),
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_stock_movements_product_id on public.stock_movements(product_id);

alter table public.stock_movements enable row level security;

create policy "Admins can view stock movements"
  on public.stock_movements for select
  using (has_role(auth.uid(), 'admin'::app_role));

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text,
  p_order_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if auth.role() <> 'service_role' and not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Niet toegelaten';
  end if;

  update public.products
  set stock_quantity = stock_quantity + p_delta
  where id = p_product_id
    and stock_quantity + p_delta >= 0;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Onvoldoende voorraad voor product %', p_product_id;
  end if;

  insert into public.stock_movements (product_id, delta, reason, order_id, created_by)
  values (
    p_product_id, p_delta, p_reason, p_order_id,
    case when auth.role() = 'service_role' then null else get_my_member_id() end
  );
end;
$$;

grant execute on function public.adjust_stock(uuid, integer, text, uuid) to authenticated;

-- ── Koppeling met bestaande facturatie ──────────────────────────────────
-- member_id op invoices blijft altijd gevuld (ook bij gastbestellingen,
-- via dezelfde find-or-create-member-logica als bij donaties), dus de
-- bestaande invoice_has_customer-check hoeft niet aangepast. order_id is
-- enkel voor traceerbaarheid.
alter table public.invoices add column order_id uuid references public.orders(id) on delete set null;
create index idx_invoices_order_id on public.invoices(order_id);

-- ── Storage bucket voor productfoto's ───────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Product images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and has_role(auth.uid(), 'admin'::app_role));
