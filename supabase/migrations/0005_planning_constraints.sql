-- Contraintes horaires + notes pour le planning semaine / mois

alter table public.profiles
  add column if not exists usual_start_time time not null default '09:00',
  add column if not exists usual_end_time time not null default '17:00',
  add column if not exists max_hours_per_week numeric,
  add column if not exists constraint_notes text;

alter table public.profiles
  drop constraint if exists profiles_hours_order;

alter table public.profiles
  add constraint profiles_hours_order check (usual_end_time > usual_start_time);

alter table public.profiles
  drop constraint if exists profiles_max_hours_positive;

alter table public.profiles
  add constraint profiles_max_hours_positive check (
    max_hours_per_week is null or max_hours_per_week > 0
  );
