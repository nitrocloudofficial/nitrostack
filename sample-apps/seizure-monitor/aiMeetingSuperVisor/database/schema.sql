-- Meeting Supervisor: Supabase (PostgreSQL) schema
-- Phase 1 foundation: Users, Meetings, Tasks

create extension if not exists "uuid-ossp";

create type user_role as enum ('lead', 'member');
create type meeting_status as enum ('scheduled', 'in_progress', 'completed', 'missed', 'rescheduled');
create type task_status as enum ('proposed', 'accepted', 'denied', 'in_progress', 'done');

create table users (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    full_name text not null,
    role user_role not null default 'member',
    google_calendar_token jsonb,
    created_at timestamptz not null default now()
);

create table meetings (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    scheduled_start timestamptz not null,
    scheduled_end timestamptz not null,
    status meeting_status not null default 'scheduled',
    organizer_id uuid references users(id) on delete set null,
    google_calendar_event_id text,
    transcript text,
    keynotes jsonb,               -- extracted action items / decisions
    vector_id text,               -- pointer into vector DB (Pinecone/Chroma)
    created_at timestamptz not null default now()
);

create table meeting_participants (
    meeting_id uuid references meetings(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    primary key (meeting_id, user_id)
);

create table tasks (
    id uuid primary key default uuid_generate_v4(),
    meeting_id uuid references meetings(id) on delete set null,
    title text not null,
    description text,
    assigned_to uuid references users(id) on delete set null,
    assigned_by uuid references users(id) on delete set null,
    status task_status not null default 'proposed',
    denial_reason text,
    effort_estimate text,          -- filled by Task Analyzer agent
    clarity_score numeric,         -- filled by Task Analyzer agent
    due_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_meetings_status on meetings(status);
create index idx_tasks_status on tasks(status);
create index idx_tasks_assigned_to on tasks(assigned_to);
