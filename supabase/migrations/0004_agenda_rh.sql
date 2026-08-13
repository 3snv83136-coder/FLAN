-- Agenda RH gérant : contrat, jours, documents scannés, pointage interne

create type public.contract_type as enum ('cdd', 'cdi', 'alternance', 'autre');
create type public.document_kind as enum ('contrat', 'autre');
create type public.clock_kind as enum ('debut', 'fin');

alter table public.profiles
  add column if not exists contract_type public.contract_type,
  add column if not exists work_weekdays integer[] not null default '{1,2,3,4,5}';

alter table public.profiles
  drop constraint if exists profiles_work_weekdays_valid;

alter table public.profiles
  add constraint profiles_work_weekdays_valid check (
    work_weekdays <@ '{1,2,3,4,5,6,7}'::integer[]
  );

create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.document_kind not null default 'contrat',
  file_path text not null,
  original_name text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.time_clock_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.clock_kind not null,
  clocked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_employee_documents_profile on public.employee_documents (profile_id);
create index idx_time_clock_events_profile_at
  on public.time_clock_events (profile_id, clocked_at desc);

alter table public.employee_documents enable row level security;
alter table public.time_clock_events enable row level security;

create policy "docs_select_own_or_gerant"
  on public.employee_documents for select
  using (profile_id = auth.uid() or public.is_gerant());

create policy "docs_insert_gerant"
  on public.employee_documents for insert
  with check (public.is_gerant());

create policy "docs_delete_gerant"
  on public.employee_documents for delete
  using (public.is_gerant());

create policy "clock_select_own_or_gerant"
  on public.time_clock_events for select
  using (profile_id = auth.uid() or public.is_gerant());

create policy "clock_insert_own"
  on public.time_clock_events for insert
  with check (profile_id = auth.uid() or public.is_gerant());

-- Storage : bucket privé pour les scans
insert into storage.buckets (id, name, public)
values ('employee_documents', 'employee_documents', false)
on conflict (id) do nothing;

create policy "storage_docs_select_own_or_gerant"
  on storage.objects for select
  using (
    bucket_id = 'employee_documents'
    and (
      public.is_gerant()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "storage_docs_insert_gerant"
  on storage.objects for insert
  with check (
    bucket_id = 'employee_documents'
    and public.is_gerant()
  );

create policy "storage_docs_delete_gerant"
  on storage.objects for delete
  using (
    bucket_id = 'employee_documents'
    and public.is_gerant()
  );
