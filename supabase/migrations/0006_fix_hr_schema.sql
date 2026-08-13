-- À coller tel quel dans le SQL Editor (peut être relancé sans casser).
-- Ajoute contract_type + le reste RH/planning, puis recharge le cache PostgREST.

do $$ begin
  create type public.contract_type as enum ('cdd', 'cdi', 'alternance', 'autre');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_kind as enum ('contrat', 'autre');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.clock_kind as enum ('debut', 'fin');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists contract_type public.contract_type,
  add column if not exists work_weekdays integer[] not null default '{1,2,3,4,5}',
  add column if not exists usual_start_time time not null default '09:00',
  add column if not exists usual_end_time time not null default '17:00',
  add column if not exists max_hours_per_week numeric,
  add column if not exists constraint_notes text;

alter table public.profiles drop constraint if exists profiles_work_weekdays_valid;
alter table public.profiles
  add constraint profiles_work_weekdays_valid check (
    work_weekdays <@ '{1,2,3,4,5,6,7}'::integer[]
  );

alter table public.profiles drop constraint if exists profiles_hours_order;
alter table public.profiles
  add constraint profiles_hours_order check (usual_end_time > usual_start_time);

alter table public.profiles drop constraint if exists profiles_max_hours_positive;
alter table public.profiles
  add constraint profiles_max_hours_positive check (
    max_hours_per_week is null or max_hours_per_week > 0
  );

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.document_kind not null default 'contrat',
  file_path text not null,
  original_name text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.time_clock_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.clock_kind not null,
  clocked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_documents_profile
  on public.employee_documents (profile_id);
create index if not exists idx_time_clock_events_profile_at
  on public.time_clock_events (profile_id, clocked_at desc);

alter table public.employee_documents enable row level security;
alter table public.time_clock_events enable row level security;

drop policy if exists "docs_select_own_or_gerant" on public.employee_documents;
create policy "docs_select_own_or_gerant"
  on public.employee_documents for select
  using (profile_id = auth.uid() or public.is_gerant());

drop policy if exists "docs_insert_gerant" on public.employee_documents;
create policy "docs_insert_gerant"
  on public.employee_documents for insert
  with check (public.is_gerant());

drop policy if exists "docs_delete_gerant" on public.employee_documents;
create policy "docs_delete_gerant"
  on public.employee_documents for delete
  using (public.is_gerant());

drop policy if exists "clock_select_own_or_gerant" on public.time_clock_events;
create policy "clock_select_own_or_gerant"
  on public.time_clock_events for select
  using (profile_id = auth.uid() or public.is_gerant());

drop policy if exists "clock_insert_own" on public.time_clock_events;
create policy "clock_insert_own"
  on public.time_clock_events for insert
  with check (profile_id = auth.uid() or public.is_gerant());

insert into storage.buckets (id, name, public)
values ('employee_documents', 'employee_documents', false)
on conflict (id) do nothing;

drop policy if exists "storage_docs_select_own_or_gerant" on storage.objects;
create policy "storage_docs_select_own_or_gerant"
  on storage.objects for select
  using (
    bucket_id = 'employee_documents'
    and (
      public.is_gerant()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "storage_docs_insert_gerant" on storage.objects;
create policy "storage_docs_insert_gerant"
  on storage.objects for insert
  with check (
    bucket_id = 'employee_documents'
    and public.is_gerant()
  );

drop policy if exists "storage_docs_delete_gerant" on storage.objects;
create policy "storage_docs_delete_gerant"
  on storage.objects for delete
  using (
    bucket_id = 'employee_documents'
    and public.is_gerant()
  );

notify pgrst, 'reload schema';
