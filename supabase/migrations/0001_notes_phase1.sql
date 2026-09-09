-- Notes Phase 1: Subjects -> Notes
-- Creates the core tables for the Notes feature and locks them down with
-- Row Level Security so each user can only ever see/modify their own data.

-- gen_random_uuid() requires pgcrypto (already enabled on most Supabase
-- projects, but declared here defensively).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deleting a subject removes its notes automatically (on delete cascade
-- above on notes.subject_id).

create index if not exists subjects_user_id_idx on public.subjects (user_id);
create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_subject_id_idx on public.notes (subject_id);

-- ---------------------------------------------------------------------
-- Keep updated_at accurate automatically on every UPDATE
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.subjects enable row level security;
alter table public.notes enable row level security;

-- Subjects: a user may only read/write their own rows.
drop policy if exists "Subjects are viewable by owner" on public.subjects;
create policy "Subjects are viewable by owner"
  on public.subjects for select
  using (auth.uid() = user_id);

drop policy if exists "Subjects are insertable by owner" on public.subjects;
create policy "Subjects are insertable by owner"
  on public.subjects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Subjects are updatable by owner" on public.subjects;
create policy "Subjects are updatable by owner"
  on public.subjects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Subjects are deletable by owner" on public.subjects;
create policy "Subjects are deletable by owner"
  on public.subjects for delete
  using (auth.uid() = user_id);

-- Notes: owner-only, and INSERT/UPDATE additionally require that
-- subject_id points to a subject owned by the same authenticated user —
-- otherwise a user could attach a note (with their own user_id) to
-- someone else's subject_id.
drop policy if exists "Notes are viewable by owner" on public.notes;
create policy "Notes are viewable by owner"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "Notes are insertable by owner" on public.notes;
create policy "Notes are insertable by owner"
  on public.notes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Notes are updatable by owner" on public.notes;
create policy "Notes are updatable by owner"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Notes are deletable by owner" on public.notes;
create policy "Notes are deletable by owner"
  on public.notes for delete
  using (auth.uid() = user_id);
