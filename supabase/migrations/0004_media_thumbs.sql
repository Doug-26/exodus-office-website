-- Small preview files for uploaded media, generated in the admin's browser at upload time.
--   image      → a resized copy (~800 px) used for cards, gallery tiles and admin thumbnails;
--                the original (also resized, ~2048 px) is only loaded in the lightbox.
--   video_file → a poster frame, so pages never download video just to show a still.
--   video_embed→ always null (YouTube has its own thumbnail).
-- Null for media uploaded before this migration; the app falls back to the original file.
--
-- No grant/RLS changes: project_media policies are row-level and the table grants cover new
-- columns. The file lives in the same public `project-media` bucket as the original.

alter table public.project_media
  add column if not exists thumb_path text check (char_length(thumb_path) <= 300);

alter table public.project_media
  drop constraint if exists project_media_thumb_source;
alter table public.project_media
  add constraint project_media_thumb_source check (type <> 'video_embed' or thumb_path is null);
