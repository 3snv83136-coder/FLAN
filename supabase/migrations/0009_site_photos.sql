-- Photos magasin / produit (back-office gérant) — bucket public site_photos

alter table public.points_of_sale
  add column if not exists photo_path text;

alter table public.products
  add column if not exists photo_path text;

comment on column public.points_of_sale.photo_path is
  'chemin Storage bucket site_photos';
comment on column public.products.photo_path is
  'chemin Storage bucket site_photos';

insert into storage.buckets (id, name, public)
values ('site_photos', 'site_photos', true)
on conflict (id) do update set public = true;

drop policy if exists "site_photos_select" on storage.objects;
create policy "site_photos_select"
  on storage.objects for select
  using (bucket_id = 'site_photos');

drop policy if exists "site_photos_insert_gerant" on storage.objects;
create policy "site_photos_insert_gerant"
  on storage.objects for insert
  with check (
    bucket_id = 'site_photos'
    and public.is_gerant()
  );

drop policy if exists "site_photos_update_gerant" on storage.objects;
create policy "site_photos_update_gerant"
  on storage.objects for update
  using (
    bucket_id = 'site_photos'
    and public.is_gerant()
  );

drop policy if exists "site_photos_delete_gerant" on storage.objects;
create policy "site_photos_delete_gerant"
  on storage.objects for delete
  using (
    bucket_id = 'site_photos'
    and public.is_gerant()
  );

notify pgrst, 'reload schema';
