-- Phase 1 — enregistrement atomique d'une vente + décrément stock PDV
-- Idempotent sur p_id (offline-first / retry sync).

create or replace function public.record_sale(
  p_id uuid,
  p_point_of_sale_id uuid,
  p_total_cents integer,
  p_payment_method public.payment_method,
  p_sold_at timestamptz,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_pos uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_price integer;
  v_item_id uuid;
  v_remaining integer;
  v_available integer;
  r record;
begin
  if v_uid is null then
    raise exception 'non_authentifie';
  end if;

  select role, point_of_sale_id
    into v_role, v_pos
  from public.profiles
  where id = v_uid and is_active = true;

  if v_role is null then
    raise exception 'profil_inactif';
  end if;

  if v_role = 'producteur' then
    raise exception 'role_interdit';
  end if;

  if v_role = 'vendeur' and (v_pos is null or v_pos is distinct from p_point_of_sale_id) then
    raise exception 'pdv_interdit';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items_vides';
  end if;

  -- Retry offline : si la vente existe déjà, on considère la sync OK
  if exists (select 1 from public.sales where id = p_id) then
    update public.sales
      set synced_at = coalesce(synced_at, now())
    where id = p_id;
    return p_id;
  end if;

  insert into public.sales (
    id,
    point_of_sale_id,
    sold_by,
    total_cents,
    payment_method,
    sold_at,
    synced_at
  ) values (
    p_id,
    p_point_of_sale_id,
    v_uid,
    p_total_cents,
    p_payment_method,
    p_sold_at,
    now()
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'unit_price_cents')::integer;
    v_item_id := coalesce((v_item->>'id')::uuid, gen_random_uuid());

    if v_qty is null or v_qty <= 0 then
      raise exception 'quantite_invalide';
    end if;

    insert into public.sale_items (
      id,
      sale_id,
      product_id,
      quantity,
      unit_price_cents
    ) values (
      v_item_id,
      p_id,
      v_product_id,
      v_qty,
      v_price
    );

    select coalesce(sum(quantity), 0)
      into v_available
    from public.stock_items
    where point_of_sale_id = p_point_of_sale_id
      and product_id = v_product_id;

    if v_available < v_qty then
      raise exception 'stock_insuffisant';
    end if;

    v_remaining := v_qty;

    for r in
      select id, quantity
      from public.stock_items
      where point_of_sale_id = p_point_of_sale_id
        and product_id = v_product_id
        and quantity > 0
      order by updated_at asc, id asc
      for update
    loop
      exit when v_remaining <= 0;

      if r.quantity <= v_remaining then
        v_remaining := v_remaining - r.quantity;
        update public.stock_items
          set quantity = 0, updated_at = now()
        where id = r.id;
      else
        update public.stock_items
          set quantity = quantity - v_remaining, updated_at = now()
        where id = r.id;
        v_remaining := 0;
      end if;
    end loop;
  end loop;

  return p_id;
end;
$$;

revoke all on function public.record_sale(uuid, uuid, integer, public.payment_method, timestamptz, jsonb) from public;
grant execute on function public.record_sale(uuid, uuid, integer, public.payment_method, timestamptz, jsonb) to authenticated;
