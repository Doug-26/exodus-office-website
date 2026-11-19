import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { Supabase } from './supabase';

/**
 * Admin authentication. Anyone can have a Supabase account, but only users
 * listed in the `admins` table are treated as admins (enforced again by RLS).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(Supabase);

  readonly session = signal<Session | null>(null);
  readonly isAdmin = signal(false);
  readonly email = computed(() => this.session()?.user.email ?? '');

  private initPromise?: Promise<void>;
  /** Guards against out-of-order async session updates. */
  private seq = 0;

  /** Resolves once the stored session (if any) has been restored. */
  ready(): Promise<void> {
    if (!this.sb.configured) return Promise.resolve();
    this.initPromise ??= this.init();
    return this.initPromise;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.sb.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!(await this.checkAdmin(data.user.id))) {
      await this.signOut();
      throw new Error('This account does not have admin access.');
    }
    await this.applySession(data.session);
  }

  async signOut(): Promise<void> {
    this.seq++;
    this.session.set(null);
    this.isAdmin.set(false);
    await this.sb.client.auth.signOut();
  }

  private async init(): Promise<void> {
    const { data } = await this.sb.client.auth.getSession();
    await this.applySession(data.session);
    this.sb.client.auth.onAuthStateChange((_event, session) => {
      // Supabase recommends not awaiting other Supabase calls inside this callback.
      setTimeout(() => void this.applySession(session));
    });
  }

  private async applySession(session: Session | null): Promise<void> {
    const n = ++this.seq;
    const admin = session ? await this.checkAdmin(session.user.id) : false;
    if (n !== this.seq) return;
    this.session.set(session);
    this.isAdmin.set(admin);
  }

  private async checkAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.sb.client
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    return !error && !!data;
  }
}
