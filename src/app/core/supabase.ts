import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const MEDIA_BUCKET = 'project-media';
/** Supabase free tier rejects single files over 50 MB. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. Add your project URL and anon key in src/environments/environment.ts.');
  }
}

/** Single shared Supabase client, created lazily on first use. */
@Injectable({ providedIn: 'root' })
export class Supabase {
  readonly url = environment.supabaseUrl.replace(/\/+$/, '');
  readonly anonKey = environment.supabaseAnonKey;
  readonly configured = Boolean(this.url && this.anonKey);

  private instance?: SupabaseClient;

  get client(): SupabaseClient {
    if (!this.configured) throw new SupabaseNotConfiguredError();
    this.instance ??= createClient(this.url, this.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return this.instance;
  }

  /** Public URL of a file in the media bucket (bucket is public-read). */
  publicUrl(path: string): string {
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    return `${this.url}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`;
  }
}
