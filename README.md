# Exodus Home Office: Website

The public website and portfolio for **Exodus Home Office**, a team of Social Media Managers, Video Editors, and Bookkeepers. It also includes a private admin panel where the team uploads projects and reads inquiries.

| Part | Tech |
| --- | --- |
| Frontend | Angular 22 (standalone components, signals, zoneless) + Bootstrap 5 (custom SCSS theme) + Bootstrap Icons |
| Backend | [Supabase](https://supabase.com): Postgres, Storage, Auth, Edge Functions |
| Email | [Resend](https://resend.com), sent from a Supabase Edge Function |
| Hosting | Any static host (Vercel and Netlify configs included) |

## Pages

- **Public:** `/` home · `/about` · `/services` · `/portfolio` · `/portfolio/:slug` · `/contact`
- **Admin** (no public link): `/admin/login` · `/admin/projects` (create, edit, publish, feature, reorder, upload media) · `/admin/inquiries`

Projects can contain:
- **Images**: uploaded (shown as a gallery with a lightbox)
- **Video files**: uploaded, up to 50 MB each (Supabase free tier limit)
- **Video links**: YouTube (including Shorts and unlisted videos), Vimeo, or Facebook (public videos and Reels). Use these for anything long.
  - Facebook: copy the link from the browser's address bar (`facebook.com/reel/…` or `…/videos/…`). `fb.watch` and `/share/` links can't be embedded. Facebook doesn't provide thumbnails, so set a cover image for those projects.

## Run locally

```bash
npm install
npm start          # http://localhost:4200
npm test           # unit tests (Vitest)
npm run build      # production build → dist/exodus-office-website/browser
```

The site runs without Supabase. Until it's connected, the portfolio shows a "coming soon" state and the admin login shows a setup notice.

## Connect Supabase (one-time setup)

1. **Create a project** at [supabase.com](https://supabase.com). The free tier is enough to start.
2. **Create the database.** Open *SQL Editor*, then paste and **Run** each file in [supabase/migrations/](supabase/migrations/) in order:
   - [0001_init.sql](supabase/migrations/0001_init.sql): the tables, security rules (RLS), and the public `project-media` storage bucket.
   - [0002_hardening.sql](supabase/migrations/0002_hardening.sql): rate-limits the contact form and blocks SVG uploads.
   - [0003_inquiry_context.sql](supabase/migrations/0003_inquiry_context.sql): inquiries remember the project the visitor clicked "Start a project" on, plus their "What did you like" picks and timeline. It also limits which inquiry columns visitors can write.
   - [0004_media_thumbs.sql](supabase/migrations/0004_media_thumbs.sql): stores a small thumbnail (or video poster frame) next to each upload, so pages load small previews instead of full-size files.
3. **Add the keys to the app.** Put these two values into [src/environments/environment.ts](src/environments/environment.ts):
   - **Project URL**: `https://<project-id>.supabase.co`. Take the *Project ID* from *Project Settings → General*. The full URL is also shown under *Integrations → Data API* and behind the **Connect** button at the top of the dashboard.
   - **Publishable key** (`sb_publishable_…`), from *Project Settings → API Keys*. The legacy `anon` key also works.

   The publishable key is safe to ship in the browser because RLS limits what it can do. **Never** put the secret key (`sb_secret_…`) or the legacy `service_role` key in the app.
4. **Create admin accounts.** In *Authentication → Users → Add user*, create a user with an email and password for each team member who will manage the site. Then grant them admin rights in the SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'teammate@example.com';
   ```
   Also turn off public sign-ups (*Authentication → Sign In / Providers → Allow new users to sign up*), since accounts are created by hand.
5. Sign in at **`/admin/login`**.

### Email notifications for new inquiries (optional but recommended)

Every inquiry is always saved and visible in `/admin/inquiries`. To also get an email:

1. Create a [Resend](https://resend.com) account, verify your sending domain, and create an API key.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set RESEND_API_KEY=re_xxx \
     NOTIFY_TO=office@yourdomain.com \
     NOTIFY_FROM="Exodus Website <website@yourdomain.com>" \
     WEBHOOK_SECRET=<a-long-random-string>
   supabase functions deploy notify-inquiry --no-verify-jwt
   ```
   Links in the email (the project the visitor asked about, and the admin Inquiries page) use `https://exodushomeoffice.com`. To use another domain, also set `SITE_URL=https://your-domain`.
3. In the dashboard, open *Integrations → Database Webhooks* (older dashboards: *Database → Webhooks*). The first time, click **Install integration** to enable the `pg_net` extension (choose the `extensions` schema if asked). Then open the **Webhooks** tab → *Create a new hook*:
   - Table: `inquiries`, Events: **Insert**
   - Type: **Supabase Edge Functions** → `notify-inquiry`, method POST
   - HTTP header: `x-webhook-secret` = the same `WEBHOOK_SECRET` value

### "Want something similar?" inquiries

The **Start a project** button on a project page opens `/contact?project=<slug>`. The contact form then shows a "You're asking about" card (the visitor can remove it) and optional "What did you like about it?" picks. Every inquiry also has an optional "When do you need it?" question.

- The email subject and body name the project, with a link to it.
- In `/admin/inquiries` the inquiry shows a "Re: <project>" badge and, when opened, the project with *View on site* / *Edit project* links. The reply email subject names the project too.
- `/admin/projects` shows how many inquiries each project has brought in, linking to those inquiries.

Only the project's id is sent from the browser. The database checks that the project is published and saves its title itself, so the inquiry still makes sense after the project is renamed or deleted.

**Shipping database changes:** the website deploys on every push, but migrations and the Edge Function are deployed by hand. Recommended order: run the migration, deploy the function, then push the site. The contact form keeps working in any order: if the database doesn't have the new columns yet, the project, picks and timeline are added to the end of the message instead.

### Keeping the site fast with lots of media

Uploads are optimised in the browser before they're sent:
- Images are resized to at most 2048 px and saved as WebP (JPEG on Safari), plus an 800 px thumbnail. Cards and galleries load the thumbnail; the full image only loads in the viewer.
- Videos get a poster frame, so pages show a still image and the video only downloads when someone presses play.
- Cover images are resized to at most 1600 px.

Media uploaded before `0004_media_thumbs.sql` still works, just without these savings (videos load as they scroll into view). To optimise an older item, delete it and upload it again. Large or long videos are still best added as YouTube/Vimeo links: uploaded videos are stored as-is, up to 50 MB.

## Customize

| What | Where |
| --- | --- |
| Email, phone, location, social links | [src/app/site.config.ts](src/app/site.config.ts) (empty values are hidden) |
| Brand colors, fonts, radius | [src/styles/_variables.scss](src/styles/_variables.scss) |
| Services and values text | [src/app/data/services.data.ts](src/app/data/services.data.ts) |
| Logo / favicon | [public/logo.svg](public/logo.svg) |
| Portfolio categories | `CATEGORIES` in [src/app/data/models.ts](src/app/data/models.ts) **and** the `project_category` enum in the SQL |

## Deploy

**Cloudflare Pages (recommended, free for business sites):** *Workers & Pages → Create → Pages → Connect to Git*, then:
- Build command: `npm run build`
- Build output directory: `dist/exodus-office-website/browser`
- Environment variable: `NODE_VERSION` = `24`

SPA routing works automatically. [public/_headers](public/_headers) adds the security headers, including a Content Security Policy, and long-term caching for the build's hashed JS/CSS/font files. If you add a new external source (another Supabase project, font, or video provider), update the CSP there.

**Netlify:** same build command and publish directory. [public/_redirects](public/_redirects) handles SPA routing, and `_headers` works there too.
**Vercel:** [vercel.json](vercel.json) is included, but Vercel's free Hobby plan is for non-commercial use only, and it doesn't read `_headers` (copy its security and caching headers into `vercel.json` if you move there).

### Custom domain (`exodushomeoffice.com`)
The domain is registered with Cloudflare Registrar, so DNS is already on Cloudflare.
1. *Workers & Pages → (project) → Custom domains → Set up a custom domain*: add `exodushomeoffice.com`, then add `www.exodushomeoffice.com` too.
2. Send `www` and `*.pages.dev` traffic to the main domain with a 301 redirect (*Rules → Redirect Rules* for `www`; *Bulk Redirects* for `pages.dev`). `_redirects` can't redirect between domains.
3. Supabase *Authentication → URL Configuration*: set Site URL to `https://exodushomeoffice.com` and add `https://exodushomeoffice.com/**` to Redirect URLs.
4. The live URL is `SITE.url` in [src/app/site.config.ts](src/app/site.config.ts), and it's also hardcoded in [src/index.html](src/index.html), [public/robots.txt](public/robots.txt), [public/sitemap.xml](public/sitemap.xml) and (as the `SITE_URL` default) [supabase/functions/notify-inquiry/index.ts](supabase/functions/notify-inquiry/index.ts). If the domain ever changes, update all five, or set the `SITE_URL` secret instead of editing the function.
5. Email: *Email → Email Routing* forwards `contact@exodushomeoffice.com` to an existing inbox for free (one destination per address, so use a Google Group to reach the whole team). For notifications, verify the domain in Resend (it adds DNS records to Cloudflare) and send from it, e.g. `NOTIFY_FROM="Exodus Website <website@exodushomeoffice.com>"`. `NOTIFY_TO` takes a comma-separated list, so every teammate can get inquiry emails.

### Before going live
1. Make sure every migration in [supabase/migrations/](supabase/migrations/) has been run (see setup step 2). `0002_hardening.sql` rate-limits the contact form, and `0003_inquiry_context.sql` closes a gap that let scripts set an inquiry's date and slip past that limit.
2. Turn off public sign-ups (see setup step 4) and set *Authentication → URL Configuration → Site URL* to the live URL.
3. Check *Advisors → Security Advisor* in the Supabase dashboard.

### Running on the free plans
- **Supabase pauses after about 7 days without activity.** [.github/workflows/keep-alive.yml](.github/workflows/keep-alive.yml) pings it twice a week. GitHub Actions must be enabled on the repo.
- **No automatic backups on the free plan.** Once a month, run `supabase db dump -f schema.sql` and `supabase db dump --data-only -f data.sql`, and keep the files somewhere private (they contain inquiries). Keep the original media files too.
- **Limits: 1 GB storage, 5 GB/month bandwidth.** Post long videos on YouTube/Vimeo and add them as links instead of uploading them.
- **Email without a domain:** use `NOTIFY_FROM="Exodus Website <onboarding@resend.dev>"`. Resend then delivers only to the Resend account's own email, so sign up to Resend with the office inbox and use that address as `NOTIFY_TO`.

## Project structure

```
src/app/
  core/       Supabase client, auth service, admin guards, SEO/title strategy
  data/       Models + services for projects, media, inquiries; services/values copy
  shared/     Navbar, footer, layout, project card, video embed, lightbox, utils
  pages/      Public pages (home, about, services, portfolio, project detail, contact, 404)
  admin/      Lazy-loaded admin panel (login, projects, media manager, inquiries)
src/styles/   Theme variables, base styles, component styles, admin styles
supabase/     SQL migrations and the notify-inquiry Edge Function
```
