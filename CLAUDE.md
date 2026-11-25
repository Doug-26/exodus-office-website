# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Public website + portfolio for **Exodus Home Office** (Social Media Managers, Video Editors, Bookkeepers), plus a private admin panel (`/admin`) where the team manages portfolio projects and reads contact inquiries. See [README.md](README.md) for Supabase setup, email notifications, and deployment steps.

Stack: Angular 22 (standalone components, signals, zoneless, no NgModules) · Bootstrap 5 SCSS only (no Bootstrap JS) + Bootstrap Icons · Supabase (Postgres, Storage, Auth, Edge Functions) · Resend for email · static hosting (Vercel / Netlify).

## Commands

```bash
npm start                      # dev server, http://localhost:4200
npm run build                  # production build → dist/exodus-office-website/browser
npm test                       # Vitest via Angular's @angular/build:unit-test builder
npx ng test --include src/app/shared/utils/slug.spec.ts   # run a single spec file
npx ng test --watch=false      # single run (CI-style)
npx prettier --write <files>   # formatting (printWidth 100, single quotes, angular parser for .html)
```

**All Angular code must follow the team's Angular best practices:** @.claude/angular-best-practices.md

There is no ESLint setup. Specs use Vitest globals (`describe`/`it`/`expect`, see [tsconfig.spec.json](tsconfig.spec.json)), not Jasmine.

Production build budgets ([angular.json](angular.json)): initial bundle warns at 800 kB / errors at 1.2 MB; **per-component styles warn at 6 kB / error at 10 kB**. Put larger styles in `src/styles/` instead of component `styles`.

## Architecture

### Data flow: browser → Supabase directly, security lives in RLS
There is no custom backend server. Angular services call Supabase with the **publishable (anon) key** from [src/environments/environment.ts](src/environments/environment.ts). All authorization is enforced by Row Level Security in [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql):
- anon: read **published** projects and their media; insert inquiries (never read them), and only the columns granted in [0003_inquiry_context.sql](supabase/migrations/0003_inquiry_context.sql) (`name, email, service, message, project_id, liked, timeline`). A new visitor-writable inquiry column needs adding to that column grant in a new migration.
- admin: full access. "Admin" = signed-in user whose id is in `public.admins`, checked by the `is_admin()` SECURITY DEFINER function.
- Storage bucket `project-media` is public-read, admin-only write, 50 MB per-file limit.

Any new table or operation needs matching grants + RLS policies in SQL. Client-side checks (e.g. `adminGuard`) are only UX. Never put the secret/service_role key in the app.

### "Not configured" mode
[src/app/core/supabase.ts](src/app/core/supabase.ts) exposes `configured`; `client` throws `SupabaseNotConfiguredError` if URL/key are empty. Public data methods (`listPublished`, `getBySlug`, etc.) return empty results when unconfigured so the site still renders (portfolio shows "coming soon", admin login shows a setup notice). Preserve this behaviour when adding public data access.

### Layers (`src/app/`)
- `core/`: `Supabase` (lazy singleton client + `publicUrl()` for bucket files), `AuthService` (signals `session`/`isAdmin`, `ready()` restores the session; the admin check queries `admins`), `adminGuard`/`loginGuard`, `SeoTitleStrategy` + `SeoService`.
- `data/`: `models.ts` (TS types mirroring the SQL enums/tables) and promise-based services (`ProjectsService`, `MediaService`, `InquiriesService`). Services throw `Error`s with admin-friendly messages via `friendlyError()` (e.g. Postgres `23505` → duplicate slug). `services.data.ts` holds static marketing copy.
- `pages/`: public pages, lazy-loaded under `PublicLayout` (navbar/footer).
- `admin/`: lazy-loaded route tree ([admin.routes.ts](src/app/admin/admin.routes.ts)); `/admin/projects/new` and `/admin/projects/:id` share `ProjectForm`.
- `shared/`: presentational components (incl. `ProjectThumb`, the cover → video frame → icon thumbnail) + pure utils (`slug`, `video-url`, `media-aspect`, `min-duration`, `inquiry-project`); the utils have the unit tests.

### Inquiries that reference a project
"Start a project" on `/portfolio/:slug` links to `/contact?project=<slug>&service=<id>` (`projectContactParams()`). The contact form resolves the slug with `getBySlug` and sends only `project_id`. The `set_inquiry_project()` BEFORE INSERT trigger keeps the id only for a published project and writes `project_title`/`project_slug` itself (visitors can't set them), so the snapshot survives renames and deletion (`on delete set null`) and travels in the webhook payload. Admin loads the referenced projects with `ProjectsService.listByIds()` (a second query, not an embed) and renders them via `projectRef()` (`live`/`unpublished`/`deleted`/`unresolved`). `InquiriesService.submit()` must keep working against a database one migration behind: it only sends the newer columns when set, and on `isMissingColumnError()` retries once with them folded into the message (`messageWithContext()`).

### Conventions seen across the code
- Components are standalone, mostly with **inline templates**, using `inject()`, signals/`computed`, and the `@if`/`@for` control flow (no `*ngIf`/`*ngFor`). Data is loaded with async/await into signals (`loading`/`error`/data), not RxJS.
- Route params bind to component inputs (`withComponentInputBinding()`).
- SEO: set `title` and `data.description` on routes; `data.noindex` on any ancestor (the whole `/admin` tree has it) adds `noindex`. Pages with dynamic content (project detail) call `SeoService.set()` themselves.
- Admin save actions wrap work in `withMinDuration()` so spinners don't flicker.
- Ordering is a `sort_order` integer; `saveOrder(items)` writes array index as `sort_order`, but only for rows that changed (`changedOrder()` in [sort-order.ts](src/app/shared/utils/sort-order.ts)), then callers apply `withIndexOrder()` locally. Nested media from `select('*, project_media(*)')` is re-sorted client-side.

### Project media model
`project_media.type` is `image` | `video_file` (uploaded to storage, `storage_path` set) | `video_embed` (`embed_url` set). A DB check constraint enforces exactly one source. Embeds must go through `parseVideoUrl()` ([video-url.ts](src/app/shared/utils/video-url.ts)), which accepts only YouTube/Vimeo/Facebook and rebuilds the iframe URL from the validated id. Never put raw user URLs in an iframe. Uploads use XHR in `MediaService.upload()` (for progress events) instead of supabase-js.

**Media performance rules** (Free plan, so there are no server-side image transformations):
- Uploads are optimised in the admin's browser by [image-resize.ts](src/app/shared/utils/image-resize.ts). `prepareUpload()` caps images at 2048 px (WebP, or JPEG on Safari), stores an 800 px thumbnail, and captures a poster frame for videos. Both the thumbnail and the poster go in `project_media.thumb_path` (migration 0004, optional in `ProjectMedia`). Covers go through `prepareCover()` (1600 px). GIFs keep their original file. Videos aren't transcoded.
- Never show an original where a small file will do. Use `ProjectsService.thumbUrl()` / `MediaService.thumbUrl()` (built on `previewPath()` in models.ts) for cards, tiles and admin thumbnails; `mediaUrl()` is only for the lightbox and the video player. Deleting media must also delete `thumb_path`.
- Card cover fallback chain: `cover_path` → first image's thumb → YouTube thumbnail → first video's poster → (older uploads) the video file itself.
- A `<video>` without a poster must use `[appLazySrc]` ([lazy-video.ts](src/app/shared/lazy-video.ts)), never a bare `[src]`, so it only loads near the viewport. With a poster, use `[poster]` + `preload="none"`.
- `VideoEmbed` renders a click-to-play button first and only creates the provider iframe (with `autoplayUrl`) on click. Don't render embed iframes eagerly.
- `/portfolio` renders 12 cards per "Show more" batch; the first row is `[eager]` (likely the LCP).

### Keeping things in sync
- Portfolio categories: `CATEGORIES` in [models.ts](src/app/data/models.ts) **and** the `project_category` enum in SQL. The same applies to media types, aspects (`16:9`, `9:16`, `1:1`, `4:5`), and inquiry statuses.
- Aspect ratios map to Bootstrap `.ratio-*` classes; `4x5` and `9x16` are added in [styles.scss](src/styles.scss).
- Schema changes: add a new numbered file in `supabase/migrations/`. It's applied manually via the Supabase SQL editor or `supabase db push`.
- Inquiry columns: `Inquiry` in [models.ts](src/app/data/models.ts) **and** `InquiryRecord` in the Edge Function. `LIKED_OPTIONS` / `TIMELINE_OPTIONS` are stored as their labels (length-checked text, not enums), so rewording them needs no migration, but keep `liked` to ≤ 8 picks and timeline labels ≤ 40 characters.
- Project category → contact-form service pre-selection: `CATEGORY_SERVICE` in [inquiry-project.ts](src/app/shared/utils/inquiry-project.ts) uses `ServiceInfo['id']`, so renaming a service id is a compile error there.

### Styling
Brand tokens + Bootstrap variable overrides live in [src/styles/_variables.scss](src/styles/_variables.scss). [styles.scss](src/styles.scss) imports only the Bootstrap partials in use, so add the partial there if you use a Bootstrap component that isn't imported yet. Custom classes use the `ex-` prefix (`_components.scss`, `_admin.scss`). Business contact details/socials are in [site.config.ts](src/app/site.config.ts); empty values are hidden in the UI.

### Edge Function
[supabase/functions/notify-inquiry/index.ts](supabase/functions/notify-inquiry/index.ts) (Deno) is triggered by a Database Webhook on inquiry INSERT. It checks the `x-webhook-secret` header and emails the office via Resend. It's deployed with `--no-verify-jwt`. Secrets: `RESEND_API_KEY`, `NOTIFY_TO`, `NOTIFY_FROM`, `WEBHOOK_SECRET`, optional `SITE_URL` (defaults to the live domain; used for project and admin links). It uses only the payload record (no Supabase client), so every field it shows must be on the `inquiries` row; treat fields from newer migrations as optional.
