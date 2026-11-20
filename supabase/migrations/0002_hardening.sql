-- =============================================================================
-- Exodus Home Office: production hardening
-- Run after 0001_init.sql (SQL Editor → paste & run, or `supabase db push`).
-- =============================================================================

-- ---------------------------------------------------------------- Inquiry throttle
-- The contact form's honeypot only stops simple bots in the browser. Anyone with the
-- publishable key can POST to /rest/v1/inquiries directly, so limit inserts here:
--   • at most 10 inquiries per hour site-wide (keeps the inbox and Resend's free quota safe)
--   • at most 1 inquiry per email address every 5 minutes
-- SECURITY DEFINER because anon can insert inquiries but not read them.
create or replace function public.throttle_inquiries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.inquiries
    where created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Too many messages right now. Please try again later.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.inquiries
    where lower(email) = lower(new.email)
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'You just sent a message. Please wait a few minutes before sending another.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.throttle_inquiries() from public, anon, authenticated;

drop trigger if exists inquiries_throttle on public.inquiries;
create trigger inquiries_throttle
  before insert on public.inquiries
  for each row execute function public.throttle_inquiries();

-- ---------------------------------------------------------------- Storage MIME types
-- 'image/*' also allowed SVG, which can carry scripts. Allow only common raster
-- images and browser-playable videos.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime'
]
where id = 'project-media';
