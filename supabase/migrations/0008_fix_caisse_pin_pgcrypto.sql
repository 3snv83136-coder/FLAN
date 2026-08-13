-- Fix PIN : pgcrypto est dans le schéma `extensions` (Supabase).
-- 0007 avait search_path = public seulement → gen_salt introuvable.

create or replace function public.set_caisse_pin(p_profile_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_gerant() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'role_interdit';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'pin_invalide';
  end if;
  update public.profiles
    set caisse_pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_profile_id
    and is_active = true;
  if not found then
    raise exception 'profil_introuvable';
  end if;
end;
$$;

create or replace function public.verify_caisse_pin(
  p_pin text,
  p_point_of_sale_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_n integer;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'pin_invalide';
  end if;

  select count(*) into v_n
    from public.profiles
    where is_active = true
      and role = 'vendeur'
      and point_of_sale_id = p_point_of_sale_id
      and caisse_pin_hash is not null
      and caisse_pin_hash = crypt(p_pin, caisse_pin_hash);

  if v_n > 1 then
    raise exception 'pin_ambigu';
  end if;

  select id into v_id
    from public.profiles
    where is_active = true
      and role = 'vendeur'
      and point_of_sale_id = p_point_of_sale_id
      and caisse_pin_hash is not null
      and caisse_pin_hash = crypt(p_pin, caisse_pin_hash);

  if v_id is null then
    raise exception 'pin_inconnu';
  end if;

  return v_id;
end;
$$;

notify pgrst, 'reload schema';
