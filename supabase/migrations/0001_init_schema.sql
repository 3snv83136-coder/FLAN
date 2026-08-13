-- Phase 0 — schéma FLAN (source : data-dictionary.md)
-- Argent en centimes ; dates en timestamptz UTC ; RLS sur chaque table.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('vendeur', 'producteur', 'gerant');
create type public.pos_type as enum ('boutique', 'marche', 'stand', 'autre');
create type public.ingredient_unit as enum ('g', 'kg', 'ml', 'l', 'piece');
create type public.batch_status as enum ('en_stock', 'epuise', 'perime');
create type public.transfer_status as enum ('envoye', 'recu', 'annule');
create type public.payment_method as enum ('especes', 'cb');
create type public.loss_reason as enum ('perime', 'casse', 'invendu', 'autre');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.points_of_sale (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.pos_type not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  point_of_sale_id uuid references public.points_of_sale (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint profiles_vendeur_needs_pos check (
    role <> 'vendeur' or point_of_sale_id is not null
  )
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit public.ingredient_unit not null,
  cost_per_unit_cents integer not null check (cost_per_unit_cents >= 0),
  stock_quantity numeric not null default 0,
  low_stock_threshold numeric,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  name text not null,
  steps text,
  batch_yield integer not null check (batch_yield > 0),
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id),
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (recipe_id, ingredient_id)
);

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id),
  product_id uuid not null references public.products (id),
  produced_by uuid not null references public.profiles (id),
  quantity_produced integer not null check (quantity_produced > 0),
  produced_at timestamptz not null default now(),
  expiry_date date not null,
  status public.batch_status not null default 'en_stock',
  created_at timestamptz not null default now()
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  point_of_sale_id uuid references public.points_of_sale (id),
  product_id uuid not null references public.products (id),
  batch_id uuid references public.production_batches (id),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  batch_id uuid references public.production_batches (id),
  quantity integer not null check (quantity > 0),
  from_point_of_sale_id uuid references public.points_of_sale (id),
  to_point_of_sale_id uuid not null references public.points_of_sale (id),
  status public.transfer_status not null default 'envoye',
  sent_by uuid not null references public.profiles (id),
  sent_at timestamptz not null default now(),
  received_by uuid references public.profiles (id),
  received_at timestamptz
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  point_of_sale_id uuid not null references public.points_of_sale (id),
  sold_by uuid not null references public.profiles (id),
  total_cents integer not null check (total_cents >= 0),
  payment_method public.payment_method not null,
  sold_at timestamptz not null,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create table public.losses (
  id uuid primary key default gen_random_uuid(),
  point_of_sale_id uuid references public.points_of_sale (id),
  product_id uuid not null references public.products (id),
  batch_id uuid references public.production_batches (id),
  quantity integer not null check (quantity > 0),
  reason public.loss_reason not null,
  recorded_by uuid not null references public.profiles (id),
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes utiles
-- ---------------------------------------------------------------------------
create index idx_profiles_role on public.profiles (role);
create index idx_profiles_pos on public.profiles (point_of_sale_id);
create index idx_stock_items_pos_product on public.stock_items (point_of_sale_id, product_id);
create index idx_sales_pos_sold_at on public.sales (point_of_sale_id, sold_at desc);
create index idx_sales_sold_by on public.sales (sold_by);
create index idx_sale_items_sale on public.sale_items (sale_id);
create index idx_transfers_to_pos on public.transfers (to_point_of_sale_id, status);

-- ---------------------------------------------------------------------------
-- Helpers RLS (security definer — lecture profil courant)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_user_pos_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select point_of_sale_id from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_gerant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'gerant', false);
$$;

create or replace function public.is_producteur_or_gerant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('producteur', 'gerant'), false);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.points_of_sale enable row level security;
alter table public.products enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.production_batches enable row level security;
alter table public.stock_items enable row level security;
alter table public.transfers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.losses enable row level security;

-- profiles
create policy "profiles_select_own_or_gerant"
  on public.profiles for select
  using (id = auth.uid() or public.is_gerant());

create policy "profiles_update_own_or_gerant"
  on public.profiles for update
  using (id = auth.uid() or public.is_gerant());

create policy "profiles_insert_gerant"
  on public.profiles for insert
  with check (public.is_gerant());

-- points_of_sale
create policy "pos_select_authenticated"
  on public.points_of_sale for select
  to authenticated
  using (true);

create policy "pos_write_gerant"
  on public.points_of_sale for all
  using (public.is_gerant())
  with check (public.is_gerant());

-- products
create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (true);

create policy "products_write_gerant"
  on public.products for all
  using (public.is_gerant())
  with check (public.is_gerant());

-- ingredients / recipes / recipe_ingredients / production_batches
create policy "ingredients_select_prod_gerant"
  on public.ingredients for select
  using (public.is_producteur_or_gerant());

create policy "ingredients_write_prod_gerant"
  on public.ingredients for all
  using (public.is_producteur_or_gerant())
  with check (public.is_producteur_or_gerant());

create policy "recipes_select_prod_gerant"
  on public.recipes for select
  using (public.is_producteur_or_gerant());

create policy "recipes_write_prod_gerant"
  on public.recipes for all
  using (public.is_producteur_or_gerant())
  with check (public.is_producteur_or_gerant());

create policy "recipe_ingredients_select_prod_gerant"
  on public.recipe_ingredients for select
  using (public.is_producteur_or_gerant());

create policy "recipe_ingredients_write_prod_gerant"
  on public.recipe_ingredients for all
  using (public.is_producteur_or_gerant())
  with check (public.is_producteur_or_gerant());

create policy "batches_select_authenticated"
  on public.production_batches for select
  to authenticated
  using (true);

create policy "batches_write_prod_gerant"
  on public.production_batches for all
  using (public.is_producteur_or_gerant())
  with check (public.is_producteur_or_gerant());

-- stock_items : vendeur = son PDV ; producteur/gerant = tout
create policy "stock_select_scoped"
  on public.stock_items for select
  using (
    public.is_producteur_or_gerant()
    or point_of_sale_id = public.current_user_pos_id()
  );

create policy "stock_write_prod_gerant"
  on public.stock_items for all
  using (public.is_producteur_or_gerant())
  with check (public.is_producteur_or_gerant());

-- transfers
create policy "transfers_select_scoped"
  on public.transfers for select
  using (
    public.is_producteur_or_gerant()
    or to_point_of_sale_id = public.current_user_pos_id()
    or from_point_of_sale_id = public.current_user_pos_id()
  );

create policy "transfers_insert_prod_gerant"
  on public.transfers for insert
  with check (public.is_producteur_or_gerant());

create policy "transfers_update_receive_or_manage"
  on public.transfers for update
  using (
    public.is_producteur_or_gerant()
    or to_point_of_sale_id = public.current_user_pos_id()
  );

-- sales
create policy "sales_select_scoped"
  on public.sales for select
  using (
    public.is_gerant()
    or sold_by = auth.uid()
    or point_of_sale_id = public.current_user_pos_id()
  );

create policy "sales_insert_vendeur_or_gerant"
  on public.sales for insert
  with check (
    sold_by = auth.uid()
    and (
      public.is_gerant()
      or (
        public.current_user_role() = 'vendeur'
        and point_of_sale_id = public.current_user_pos_id()
      )
    )
  );

create policy "sales_update_own_or_gerant"
  on public.sales for update
  using (sold_by = auth.uid() or public.is_gerant());

-- sale_items
create policy "sale_items_select_via_sale"
  on public.sale_items for select
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and (
          public.is_gerant()
          or s.sold_by = auth.uid()
          or s.point_of_sale_id = public.current_user_pos_id()
        )
    )
  );

create policy "sale_items_insert_via_sale"
  on public.sale_items for insert
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and s.sold_by = auth.uid()
    )
  );

-- losses
create policy "losses_select_scoped"
  on public.losses for select
  using (
    public.is_producteur_or_gerant()
    or point_of_sale_id = public.current_user_pos_id()
  );

create policy "losses_insert_scoped"
  on public.losses for insert
  with check (
    recorded_by = auth.uid()
    and (
      public.is_producteur_or_gerant()
      or point_of_sale_id = public.current_user_pos_id()
    )
  );
