-- PIN caisse (spec Comptoir F2) — hash pgcrypto, jamais en clair

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists caisse_pin_hash text;

alter table public.profiles
  drop column if exists caisse_pin_is_set;

alter table public.profiles
  add column caisse_pin_is_set boolean
  generated always as (caisse_pin_hash is not null) stored;

comment on column public.profiles.caisse_pin_hash is 'bcrypt PIN caisse — ne jamais SELECT côté client';

revoke select (caisse_pin_hash) on public.profiles from anon, authenticated;

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

revoke all on function public.set_caisse_pin(uuid, text) from public;
grant execute on function public.set_caisse_pin(uuid, text) to authenticated, service_role;

revoke all on function public.verify_caisse_pin(text, uuid) from public;
grant execute on function public.verify_caisse_pin(text, uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
