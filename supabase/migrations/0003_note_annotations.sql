-- Notes Phase 4: handwriting + PDF annotation
--
-- One row per "drawable surface":
--   - a handwritten page:  note_id set, attachment_id NULL, page_number = 1
--   - a PDF page overlay:  note_id set, attachment_id set, page_number = the PDF page
--
-- `data` stores the strokes as structured JSON (see src/features/notes/types.ts
-- for the exact shape) so they can be replayed and edited later — never a
-- flattened raster screenshot.

create table if not exists public.note_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  attachment_id uuid references public.note_attachments(id) on delete cascade,
  page_number integer not null default 1,
  data jsonb not null default '{"strokes": []}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Integrity safety net: at most one row per (note, attachment, page). NULL
-- attachment_id (handwriting) is coalesced to a fixed sentinel so multiple
-- NULLs can't slip past standard unique-constraint NULL semantics. The
-- application does an explicit select-then-insert-or-update rather than
-- relying on this for upsert routing, so this index exists purely to make
-- a duplicate-row bug impossible, not as the primary conflict-resolution
-- mechanism.
create unique index if not exists note_annotations_unique_target
  on public.note_annotations (
    note_id,
    coalesce(attachment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    page_number
  );

create index if not exists note_annotations_note_id_idx on public.note_annotations (note_id);
create index if not exists note_annotations_attachment_id_idx on public.note_annotations (attachment_id);

grant select, insert, update, delete on table public.note_annotations to authenticated;

alter table public.note_annotations enable row level security;

-- Reuses the set_updated_at() function already created in
-- 0001_notes_phase1.sql — no need to redefine it here.
drop trigger if exists set_note_annotations_updated_at on public.note_annotations;
create trigger set_note_annotations_updated_at
before update on public.note_annotations
for each row execute function public.set_updated_at();

drop policy if exists "Annotations are viewable by owner" on public.note_annotations;
create policy "Annotations are viewable by owner"
  on public.note_annotations for select
  using (auth.uid() = user_id);

-- INSERT/UPDATE additionally require that note_id belongs to a note owned
-- by the same user, and — when this annotation belongs to a PDF page —
-- that attachment_id is both owned by this user AND actually belongs to
-- this same note_id (prevents attaching an annotation to someone else's
-- PDF, or to a PDF that belongs to a different one of the user's own notes).
drop policy if exists "Annotations are insertable by owner" on public.note_annotations;
create policy "Annotations are insertable by owner"
  on public.note_annotations for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    and (
      attachment_id is null
      or exists (
        select 1 from public.note_attachments a
        where a.id = attachment_id
          and a.user_id = auth.uid()
          and a.note_id = note_annotations.note_id
      )
    )
  );

drop policy if exists "Annotations are updatable by owner" on public.note_annotations;
create policy "Annotations are updatable by owner"
  on public.note_annotations for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    and (
      attachment_id is null
      or exists (
        select 1 from public.note_attachments a
        where a.id = attachment_id
          and a.user_id = auth.uid()
          and a.note_id = note_annotations.note_id
      )
    )
  );

drop policy if exists "Annotations are deletable by owner" on public.note_annotations;
create policy "Annotations are deletable by owner"
  on public.note_annotations for delete
  using (auth.uid() = user_id);
