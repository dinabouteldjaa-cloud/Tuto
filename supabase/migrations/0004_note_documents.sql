-- Unified Notes Workspace — Phase 1
--
-- One row per note, holding the unified document (rich text + ink) as
-- structured, versioned JSON. See src/features/notes/types.ts for the
-- exact shape (NoteDocumentData). Existing notes.content / note_annotations
-- / note_attachments data from Phases 1-4 is untouched — this table is
-- purely additive. A note has no note_documents row until the unified
-- workspace is saved for the first time; until then the app synthesizes
-- the document in memory from the legacy tables (see api.ts).

create table if not exists public.note_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  version integer not null default 1,
  document_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One document per note.
create unique index if not exists note_documents_note_id_unique
  on public.note_documents (note_id);

grant select, insert, update, delete on table public.note_documents to authenticated;

alter table public.note_documents enable row level security;

-- Reuses the set_updated_at() function already created in
-- 0001_notes_phase1.sql.
drop trigger if exists set_note_documents_updated_at on public.note_documents;
create trigger set_note_documents_updated_at
before update on public.note_documents
for each row execute function public.set_updated_at();

drop policy if exists "Note documents are viewable by owner" on public.note_documents;
create policy "Note documents are viewable by owner"
  on public.note_documents for select
  using (auth.uid() = user_id);

-- INSERT/UPDATE additionally require that note_id belongs to a note owned
-- by the same authenticated user — the same ownership-validation pattern
-- used for note_attachments and note_annotations.
drop policy if exists "Note documents are insertable by owner" on public.note_documents;
create policy "Note documents are insertable by owner"
  on public.note_documents for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

drop policy if exists "Note documents are updatable by owner" on public.note_documents;
create policy "Note documents are updatable by owner"
  on public.note_documents for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

drop policy if exists "Note documents are deletable by owner" on public.note_documents;
create policy "Note documents are deletable by owner"
  on public.note_documents for delete
  using (auth.uid() = user_id);
