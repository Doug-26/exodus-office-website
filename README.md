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
2. **Create the database.** Open *SQL Editor*, paste the contents of [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql), and click **Run**.
   This creates the tables, security rules (RLS), and the public `project-media` storage bucket.
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
3. In the dashboard, open *Database → Webhooks → Create a new hook*:
   - Table: `inquiries`, Events: **Insert**
   - Type: **Supabase Edge Functions** → `notify-inquiry`, method POST
   - HTTP header: `x-webhook-secret` = the same `WEBHOOK_SECRET` value

## Customize

| What | Where |
| --- | --- |
| Email, phone, location, social links | [src/app/site.config.ts](src/app/site.config.ts) (empty values are hidden) |
| Brand colors, fonts, radius | [src/styles/_variables.scss](src/styles/_variables.scss) |
| Services and values text | [src/app/data/services.data.ts](src/app/data/services.data.ts) |
| Logo / favicon | [public/logo.svg](public/logo.svg) |
| Portfolio categories | `CATEGORIES` in [src/app/data/models.ts](src/app/data/models.ts) **and** the `project_category` enum in the SQL |

## Deploy

**Vercel:** import the GitHub repo. [vercel.json](vercel.json) already sets the build command, output folder, and SPA rewrites.
**Netlify:** build command `npm run build`, publish directory `dist/exodus-office-website/browser`. [public/_redirects](public/_redirects) handles SPA routing.

## Project structure

```
src/app/
  core/       Supabase client, auth service, admin guards, SEO/title strategy
  data/       Models + services for projects, media, inquiries; services/values copy
  shared/     Navbar, footer, layout, project card, video embed, lightbox, utils
  pages/      Public pages (home, about, services, portfolio, project detail, contact, 404)
  admin/      Lazy-loaded admin panel (login, projects, media manager, inquiries)
src/styles/   Theme variables, base styles, component styles, admin styles
supabase/     SQL migration and the notify-inquiry Edge Function
```
