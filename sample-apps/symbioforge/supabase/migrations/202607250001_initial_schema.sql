-- SymBioForge production schema for Supabase.
-- Apply this file through the Supabase SQL editor or CLI migrations.

create table if not exists public.factories (
  id text primary key,
  name text not null,
  industry_type text not null,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  production_capacity text,
  raw_materials jsonb not null default '[]'::jsonb,
  declared_wastes jsonb not null default '[]'::jsonb,
  waste_streams jsonb,
  compliance_status text not null default 'filed'
    check (compliance_status in ('filed', 'pending', 'overdue')),
  last_filed_date date,
  savings_earned double precision not null default 0,
  co2_avoided double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telemetry_events (
  id bigserial primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  waste_stream text not null,
  volume_kg_day double precision not null check (volume_kg_day >= 0),
  recorded_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists factories_set_updated_at on public.factories;
create trigger factories_set_updated_at
before update on public.factories
for each row execute function public.set_updated_at();

alter table public.factories enable row level security;
alter table public.telemetry_events enable row level security;

drop policy if exists "server_read_factories" on public.factories;
drop policy if exists "server_write_factories" on public.factories;
drop policy if exists "server_read_telemetry" on public.telemetry_events;
drop policy if exists "server_write_telemetry" on public.telemetry_events;

-- Initial deployment policy: authenticated/anon app keys can operate.
-- Tighten these policies after user roles are added in the auth milestone.
create policy "server_read_factories"
on public.factories for select
using (true);

create policy "server_write_factories"
on public.factories for all
using (true)
with check (true);

create policy "server_read_telemetry"
on public.telemetry_events for select
using (true);

create policy "server_write_telemetry"
on public.telemetry_events for insert
with check (true);
