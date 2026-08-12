-- Schéma "Application de vente de flans"
-- Tables: recipes, ingredients, recipe_ingredients, stores, stock_items, stock_movements, sales, users
-- Auth: mappage auth.users -> public.users + RLS.

-- Utilitaires
create extension if not exists pgcrypto;

-- Enum: rôle applicatif
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'manager', 'employee');
  end if;
end $$;

-- Enum: type mouvement stock
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_item_kind') then
    create type public.stock_item_kind as enum ('ingredient', 'product');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_movement_type') then
    create type public.stock_movement_type as enum (
      'IN',
      'OUT',
      'LOSS',
      'DAMAGE',
      'PRODUCTION',
      'SALE'
    );
  end if;
end $$;

-- Users (profil applicatif)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'employee',
  store_id uuid null references public.stores(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Magasins
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  hours text not null default '',
  manager_user_id uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Recettes (flans finis)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text null,
  category text not null default '',
  prep_time_minutes int not null default 0,
  difficulty text not null default '',
  suggested_price numeric(12,2) not null default 0,
  allergens text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

-- Ingrédients (matières premières)
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null check (unit in ('g', 'ml', 'piece')),
  unit_price numeric(12,2) not null default 0,
  allergens text[] not null default '{}'::text[],
  min_threshold numeric(12,3) not null default 0,
  created_at timestamptz not null default now()
);

-- Liaison recette/ingrédients
create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric(12,3) not null,
  primary key (recipe_id, ingredient_id)
);

-- Stock "générique" (ingrédients ou produits finis) par magasin
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  kind public.stock_item_kind not null,
  ingredient_id uuid null references public.ingredients(id) on delete cascade,
  recipe_id uuid null references public.recipes(id) on delete cascade,
  quantity numeric(12,3) not null default 0,
  min_threshold numeric(12,3) not null default 0,
  created_at timestamptz not null default now(),
  constraint stock_items_kind_refs check (
    (kind = 'ingredient' and ingredient_id is not null and recipe_id is null) or
    (kind = 'product' and recipe_id is not null and ingredient_id is null)
  ),
  constraint stock_items_unique unique (store_id, kind, ingredient_id, recipe_id)
);

-- Journal des mouvements stock
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  movement_type public.stock_movement_type not null,
  quantity numeric(12,3) not null check (quantity > 0),
  note text not null default '',
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Ventes (décrément produit fini côté stock)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  sold_at timestamptz not null default now(),
  created_by uuid null references public.users(id) on delete set null
);

-- -----------------------
-- RLS: sécurité par rôle
-- -----------------------

alter table public.users enable row level security;
alter table public.stores enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;

-- Helpers (simple via EXISTS dans policies)

-- USERS
create policy "users_select_own"
  on public.users for select
  to authenticated
  using (id = auth.uid());

create policy "users_update_own"
  on public.users for update
  to authenticated
  using (id = auth.uid());

create policy "users_admin_all"
  on public.users for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- STORES (read pour tous, write admin)
create policy "stores_select_auth"
  on public.stores for select
  to authenticated
  using (true);

create policy "stores_admin_write"
  on public.stores for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "stores_admin_update_delete"
  on public.stores for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- RECIPES/INGREDIENTS (read pour tous, write admin)
create policy "recipes_select_auth"
  on public.recipes for select to authenticated using (true);

create policy "recipes_admin_write"
  on public.recipes for all to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "ingredients_select_auth"
  on public.ingredients for select to authenticated using (true);

create policy "ingredients_admin_write"
  on public.ingredients for all to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "recipe_ingredients_admin_write"
  on public.recipe_ingredients for all to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- STOCK ITEMS (read pour auth, write pour admin/manager/employee sur store)
create policy "stock_items_select_auth"
  on public.stock_items for select
  to authenticated
  using (true);

create policy "stock_items_write_admin"
  on public.stock_items for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "stock_items_write_manager_employee_own_store"
  on public.stock_items for insert, update, delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('manager','employee')
        and u.store_id = stock_items.store_id
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('manager','employee')
        and u.store_id = stock_items.store_id
    )
  );

-- STOCK MOVEMENTS
create policy "stock_movements_select_auth"
  on public.stock_movements for select
  to authenticated
  using (true);

create policy "stock_movements_write_admin"
  on public.stock_movements for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "stock_movements_write_manager_employee_own_store"
  on public.stock_movements for insert, update, delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('manager','employee')
        and u.store_id = stock_movements.store_id
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('manager','employee')
        and u.store_id = stock_movements.store_id
    )
  );

-- SALES
create policy "sales_select_auth"
  on public.sales for select
  to authenticated
  using (true);

create policy "sales_write_admin"
  on public.sales for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "sales_write_manager_employee_own_store"
  on public.sales for insert, update, delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('manager','employee')
        and u.store_id = sales.store_id
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('manager','employee')
        and u.store_id = sales.store_id
    )
  );

-- ---------------------------------------------------------
-- Trigger: création automatique du profil public.users
-- ---------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, role, store_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    'employee'::public.user_role,
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- ---------------------------------------------------------
-- Trigger: gestion du stock à partir de stock_movements
-- ---------------------------------------------------------

create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind public.stock_item_kind;
  v_recipe_id uuid;
begin
  select si.kind, si.recipe_id
    into v_kind, v_recipe_id
  from public.stock_items si
  where si.id = new.stock_item_id;

  if not found then
    raise exception 'stock_items introuvable: %', new.stock_item_id;
  end if;

  -- Ajout / retrait standard
  if new.movement_type in ('IN') then
    update public.stock_items
    set quantity = quantity + new.quantity
    where id = new.stock_item_id;

  elsif new.movement_type in ('OUT', 'LOSS', 'DAMAGE', 'SALE') then
    update public.stock_items
    set quantity = quantity - new.quantity
    where id = new.stock_item_id;

  elsif new.movement_type = 'PRODUCTION' then
    -- Production: on décrémente le produit fini
    update public.stock_items
    set quantity = quantity - new.quantity
    where id = new.stock_item_id;

    -- Puis on décrémente les ingrédients nécessaires
    if v_kind <> 'product' then
      raise exception 'PRODUCTION nécessite un stock_item kind=product';
    end if;

    -- Produit => recette
    -- v_recipe_id est la recipe_id du stock_item
    if v_recipe_id is null then
      raise exception 'stock_item produit sans recipe_id';
    end if;

    update public.stock_items si_ing
    set quantity = si_ing.quantity - (new.quantity * ri.quantity)
    from public.recipe_ingredients ri
    where ri.recipe_id = v_recipe_id
      and si_ing.store_id = new.store_id
      and si_ing.kind = 'ingredient'
      and si_ing.ingredient_id = ri.ingredient_id;

  else
    raise exception 'movement_type non géré: %', new.movement_type;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_apply_stock_movement on public.stock_movements;
create trigger tr_apply_stock_movement
after insert on public.stock_movements
for each row execute procedure public.apply_stock_movement();

