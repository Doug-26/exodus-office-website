-- =============================================================================
-- Exodus Home Office: initial schema
-- Run in Supabase: Dashboard → SQL Editor → paste & run (or `supabase db push`).
--
-- Security model (Row Level Security):
--   • Visitors (anon)  → read PUBLISHED projects + their media, submit inquiries.
--   • Admins           → full access. An admin is a signed-in user listed in
--                         public.admins (add rows manually, see README).
-- =============================================================================

-- ---------------------------------------------------------------- Types
create type public.project_category as enum ('social_media', 'video_editing', 'graphic_design', 'other');
create type public.media_type       as enum ('image', 'video_file', 'video_embed');
create type public.inquiry_status   as enum ('new', 'read', 'archived');

-- ---------------------------------------------------------------- Admins
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies can check admin status without recursive RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------- Projects
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category     public.project_category not null default 'other',
  description  text check (char_length(description) <= 10000),
  client_name  text check (char_length(client_name) <= 200),
  tools        text[] not null default '{}',
  cover_path   text,
  is_featured  boolean not null default false,
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_listing_idx on public.projects (is_published, sort_order, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- Project media
create table public.project_media (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  type         public.media_type not null,
  storage_path text,
  embed_url    text check (char_length(embed_url) <= 500),
  aspect       text not null default '16:9' check (aspect in ('16:9', '9:16', '1:1', '4:5')),
  caption      text check (char_length(caption) <= 300),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint project_media_source check (
    (type = 'video_embed' and embed_url is not null and storage_path is null)
    or (type <> 'video_embed' and storage_path is not null and embed_url is null)
  )
);

create index project_media_project_idx on public.project_media (project_id, sort_order);

-- ---------------------------------------------------------------- Inquiries
create table public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  service    text check (char_length(service) <= 80),
  message    text not null check (char_length(message) between 1 and 5000),
  status     public.inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create index inquiries_created_idx on public.inquiries (created_at desc);

-- ---------------------------------------------------------------- Grants
-- (RLS below decides which rows; these decide which operations are possible at all.)
grant select on public.admins to authenticated;
grant select on public.projects, public.project_media to anon, authenticated;
grant insert, update, delete on public.projects, public.project_media to authenticated;
grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;

-- ---------------------------------------------------------------- Row Level Security
alter table public.admins        enable row level security;
alter table public.projects      enable row level security;
alter table public.project_media enable row level security;
alter table public.inquiries     enable row level security;

-- admins: a signed-in user can only see whether they themselves are an admin.
create policy "Users can read their own admin row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- projects
create policy "Anyone can read published projects; admins read all"
  on public.projects for select to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy "Admins can insert projects"
  on public.projects for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update projects"
  on public.projects for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete projects"
  on public.projects for delete to authenticated
  using ((select public.is_admin()));

-- project_media
create policy "Anyone can read media of published projects; admins read all"
  on public.project_media for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.projects p where p.id = project_id and p.is_published)
  );

create policy "Admins can insert media"
  on public.project_media for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update media"
  on public.project_media for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete media"
  on public.project_media for delete to authenticated
  using ((select public.is_admin()));

-- inquiries: visitors can submit, never read.
create policy "Anyone can submit an inquiry"
  on public.inquiries for insert to anon, authenticated
  with check (status = 'new');

create policy "Admins can read inquiries"
  on public.inquiries for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update inquiries"
  on public.inquiries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete inquiries"
  on public.inquiries for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------- Storage
-- Public bucket: anyone can VIEW files by URL; only admins can upload/change/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-media', 'project-media', true, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

create policy "Admins can list project media files"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-media' and (select public.is_admin()));

create policy "Admins can upload project media files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-media' and (select public.is_admin()));

create policy "Admins can update project media files"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-media' and (select public.is_admin()))
  with check (bucket_id = 'project-media' and (select public.is_admin()));

create policy "Admins can delete project media files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-media' and (select public.is_admin()));
