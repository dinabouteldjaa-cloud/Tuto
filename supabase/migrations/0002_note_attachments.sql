-- Notes Phase 3: image + PDF attachments
--
-- Adds a `note_attachments` metadata table plus a private Supabase Storage
-- bucket for the actual files. Security is enforced at the database level
-- on both fronts (table RLS + storage.objects RLS) — never rely on the
-- frontend alone to keep one user's files away from another user.

-- ---------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------

create table if not exists public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

-- Deleting a note removes its attachment *records* automatically (FK
-- cascade above). This does NOT delete the underlying Storage objects —
-- the application deletes those explicitly before deleting a note/subject
-- (see deleteNote / deleteSubject in src/features/notes/api.ts). Cascade
-- alone is not enough to avoid orphaned files in Storage.

create index if not exists note_attachments_user_id_idx on public.note_attachments (user_id);
create index if not exists note_attachments_note_id_idx on public.note_attachments (note_id);

grant select, insert, update, delete on table public.note_attachments to authenticated;

alter table public.note_attachments enable row level security;

drop policy if exists "Attachments are viewable by owner" on public.note_attachments;
create policy "Attachments are viewable by owner"
  on public.note_attachments for select
  using (auth.uid() = user_id);

-- INSERT additionally requires that note_id belongs to a note owned by
-- the same authenticated user — otherwise a user could attach a file
-- (with their own user_id) to someone else's note_id.
drop policy if exists "Attachments are insertable by owner" on public.note_attachments;
create policy "Attachments are insertable by owner"
  on public.note_attachments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.notes n
      where n.id = note_id
        and n.user_id = auth.uid()
    )
  );

drop policy if exists "Attachments are deletable by owner" on public.note_attachments;
create policy "Attachments are deletable by owner"
  on public.note_attachments for delete
  using (auth.uid() = user_id);

-- No UPDATE policy: attachments are immutable metadata for Phase 3 (no
-- renaming/replacing in place). With RLS enabled and no UPDATE policy,
-- updates are denied by default — that's intentional, not an oversight.

-- ---------------------------------------------------------------------
-- Storage bucket
--
-- Private bucket (public = false). File size and MIME type are enforced
-- server-side too, not just in the UI:
--   - 15 MB per file
--   - image/jpeg, image/png, image/webp, application/pdf only
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-attachments',
  'note-attachments',
  false,
  15728640, -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored at `{userId}/{noteId}/{uniqueFileName}`. Storage RLS
-- below restricts every operation to objects whose first path segment
-- (the "folder") matches the caller's own auth.uid() — so even with the
-- exact path, one user can never read/upload/delete another user's files.

drop policy if exists "Attachment files are viewable by owner" on storage.objects;
create policy "Attachment files are viewable by owner"
  on storage.objects for select
  using (
    bucket_id = 'note-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Attachment files are insertable by owner" on storage.objects;
create policy "Attachment files are insertable by owner"
  on storage.objects for insert
  with check (
    bucket_id = 'note-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Attachment files are deletable by owner" on storage.objects;
create policy "Attachment files are deletable by owner"
  on storage.objects for delete
  using (
    bucket_id = 'note-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
