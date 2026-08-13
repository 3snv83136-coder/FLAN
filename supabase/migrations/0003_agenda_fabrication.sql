-- Phase agenda + fabrication (source : data-dictionary.md)

create type public.fabrication_status as enum ('a_faire', 'fait', 'annule');

create table public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fabrication_plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  for_date date not null,
  quantity_suggested integer not null check (quantity_suggested >= 0),
  quantity_planned integer not null check (quantity_planned >= 0),
  based_on_loss_date date not null,
  status public.fabrication_status not null default 'a_faire',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (product_id, for_date)
);

create index idx_agenda_items_profile_starts
  on public.agenda_items (profile_id, starts_at);
create index idx_fabrication_plans_for_date
  on public.fabrication_plans (for_date, status);

alter table public.agenda_items enable row level security;
alter table public.fabrication_plans enable row level security;

-- agenda : chacun voit le sien ; gerant voit tout ; gerant/producteur peuvent écrire
create policy "agenda_select_own_or_gerant"
  on public.agenda_items for select
  using (profile_id = auth.uid() or public.is_gerant());

create policy "agenda_insert_own_or_gerant"
  on public.agenda_items for insert
  with check (
    public.is_gerant()
    or profile_id = auth.uid()
  );

create policy "agenda_update_own_or_gerant"
  on public.agenda_items for update
  using (profile_id = auth.uid() or public.is_gerant());

create policy "agenda_delete_own_or_gerant"
  on public.agenda_items for delete
  using (profile_id = auth.uid() or public.is_gerant());

-- fabrication : producteur + gerant
create policy "fabrication_select_prod_gerant"
  on public.fabrication_plans for select
  using (public.is_producteur_or_gerant());

create policy "fabrication_write_prod_gerant"
  on public.fabrication_plans for all
  using (public.is_producteur_or_gerant())
  with check (public.is_producteur_or_gerant());

-- Génère / rafraîchit les plans de demain à partir des invendus d'hier
create or replace function public.refresh_fabrication_plans_from_invendus(
  p_for_date date default ((timezone('Europe/Paris', now()))::date + 1)
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_loss_date date := p_for_date - 1;
  v_count integer := 0;
  r record;
begin
  if v_uid is null or not public.is_producteur_or_gerant() then
    raise exception 'role_interdit';
  end if;

  for r in
    select
      l.product_id,
      coalesce(sum(l.quantity), 0)::integer as qty
    from public.losses l
    where l.reason = 'invendu'
      and (timezone('Europe/Paris', l.recorded_at))::date = v_loss_date
    group by l.product_id
    having sum(l.quantity) > 0
  loop
    insert into public.fabrication_plans (
      product_id,
      for_date,
      quantity_suggested,
      quantity_planned,
      based_on_loss_date,
      status,
      created_by
    ) values (
      r.product_id,
      p_for_date,
      r.qty,
      r.qty,
      v_loss_date,
      'a_faire',
      v_uid
    )
    on conflict (product_id, for_date) do update
      set quantity_suggested = excluded.quantity_suggested,
          based_on_loss_date = excluded.based_on_loss_date,
          -- ne pas écraser une quantité déjà ajustée si status != a_faire
          quantity_planned = case
            when public.fabrication_plans.status = 'a_faire'
              then excluded.quantity_planned
            else public.fabrication_plans.quantity_planned
          end;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.refresh_fabrication_plans_from_invendus(date) from public;
grant execute on function public.refresh_fabrication_plans_from_invendus(date) to authenticated;
