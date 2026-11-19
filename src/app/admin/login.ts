import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Supabase } from '../core/supabase';
import { withMinDuration } from '../shared/utils/min-duration';

@Component({
  selector: 'app-login',
  imports: [NgOptimizedImage, ReactiveFormsModule, RouterLink],
  template: `
    <div class="ex-auth">
      <div class="card p-4 p-sm-5">
        <div class="text-center mb-4">
          <img ngSrc="logo.svg" alt="" width="56" height="56" class="mb-3" />
          <h1 class="h4 mb-1">Admin sign in</h1>
          <p class="text-body-secondary small mb-0">Exodus Home Office</p>
        </div>

        @if (!configured) {
          <div class="alert alert-warning small">
            Supabase isn't connected yet. Add your project URL and anon key to
            <code>src/environments/environment.ts</code> (see README).
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input id="email" type="email" class="form-control" formControlName="email" autocomplete="username" />
          </div>
          <div class="mb-4">
            <label for="password" class="form-label">Password</label>
            <input id="password" type="password" class="form-control" formControlName="password" autocomplete="current-password" />
          </div>
          @if (error()) {
            <div class="alert alert-danger small" role="alert">{{ error() }}</div>
          }
          <button type="submit" class="btn btn-primary w-100" [disabled]="busy() || !configured">
            @if (busy()) {
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            }
            Sign in
          </button>
        </form>
        <a routerLink="/" class="d-block text-center small mt-4">← Back to website</a>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly configured = inject(Supabase).configured;
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await withMinDuration(this.auth.signIn(email, password));
      await this.router.navigate(['/admin/projects']);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
