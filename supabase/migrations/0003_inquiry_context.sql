-- =============================================================================
-- Exodus Home Office: inquiries remember which portfolio project they came from
-- Run after 0002_hardening.sql (SQL Editor → paste & run, or `supabase db push`).
-- Safe to run before or after the new frontend / Edge Function, and safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------- Columns
--   project_id      sent by the contact form ("Want something similar?" on a project
--                   page). Kept only for a published project; NULL if it is deleted later.
--   project_title,  snapshots written by the trigger below, never by the visitor. They
--   project_slug    survive renames and deletion and travel in the webhook payload, so
--                   the notify-inquiry function needs no database access.
--   liked           optional "what did you like about it" picks (display labels).
--   timeline        optional "when do you need it" answer (display label).
-- Labels are plain length-checked text (like `service`), not enums, so new options can
-- ship in the app without a migration.
alter table public.inquiries
  add column if not exists project_id    uuid references public.projects (id) on delete set null,
  add column if not exists project_title text,
  add column if not exists project_slug  text,
  add column if not exists liked         text[] not null default '{}'
    check (cardinality(liked) <= 8 and char_length(array_to_string(liked, '')) <= 400),
  add column if not exists timeline      text check (char_length(timeline) <= 40);

create index if not exists inquiries_project_idx
  on public.inquiries (project_id)
  where project_id is not null;

-- ---------------------------------------------------------------- Trigger
-- SECURITY DEFINER like throttle_inquiries(): it checks is_published itself, and the row
-- lock needs more than anon's SELECT. It never raises: unknown and unpublished ids end the
-- same way (no reference), so nothing about hidden projects can be probed.
create or replace function public.set_inquiry_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_title text;
  ref_slug  text;
begin
  if new.project_id is not null then
    select p.title, p.slug
      into ref_title, ref_slug
    from public.projects p
    where p.id = new.project_id
      and p.is_published
    for key share; -- hold the row until this insert commits (no FK race with a delete)
  end if;

  if ref_slug is null then
    new.project_id := null;
  end if;
  new.project_title := ref_title;
  new.project_slug  := ref_slug;
  return new;
end;
$$;

revoke all on function public.set_inquiry_project() from public, anon, authenticated;

-- Fires after inquiries_throttle (same-event triggers run in name order), so throttled
-- spam costs no lookup. The WHEN clause keeps ordinary inquiries out of this function.
drop trigger if exists inquiries_validate_project on public.inquiries;
create trigger inquiries_validate_project
  before insert on public.inquiries
  for each row
  when (new.project_id is not null or new.project_title is not null or new.project_slug is not null)
  execute function public.set_inquiry_project();

-- ---------------------------------------------------------------- Column-level insert
-- Until now visitors could set ANY column, including created_at (a back-dated row is never
-- counted by throttle_inquiries()) and the snapshot columns above. Limit them to what the
-- contact form sends. Revoke first: a table-level revoke also clears column-level grants.
revoke insert on public.inquiries from anon, authenticated;
grant insert (name, email, service, message, project_id, liked, timeline)
  on public.inquiries to anon, authenticated;

-- Make the Data API see the new columns right away.
notify pgrst, 'reload schema';
