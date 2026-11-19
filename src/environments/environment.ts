/**
 * Supabase connection settings.
 *
 * supabaseUrl:     https://<Project ID>.supabase.co
 *                  (Project ID is in Project Settings → General)
 * supabaseAnonKey: the Publishable key (sb_publishable_…), from
 *                  Project Settings → API Keys
 *
 * The publishable key is safe to ship in the browser: what it can do is
 * limited by the Row Level Security policies in supabase/migrations.
 * NEVER put the secret key (sb_secret_…) or service_role key here.
 *
 * Until these are filled in, the public pages still work; the portfolio shows
 * an empty state and the admin panel explains what's missing.
 */
export const environment = {
  supabaseUrl: 'https://hjvpmmguhdbmkelwkkwt.supabase.co', // e.g. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: 'sb_publishable_HgGVGMbeySjFOKjEzczlcQ_dBEUS53j', // anon or publishable key
};
