import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="ex-admin">
      <nav class="ex-admin__bar navbar navbar-expand py-2" aria-label="Admin navigation">
        <div class="container-xl flex-wrap gap-2">
          <a class="ex-brand ex-brand--light me-4" routerLink="/admin/projects">
            <img src="logo.svg" alt="" width="34" height="34" />
            <span>
              <span class="ex-brand__name fs-6">Exodus</span>
              <span class="ex-brand__sub">Admin</span>
            </span>
          </a>
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class="nav-link" routerLink="/admin/projects" routerLinkActive="active">Projects</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/admin/inquiries" routerLinkActive="active">Inquiries</a></li>
            <li class="nav-item">
              <a class="nav-link" href="/" target="_blank" rel="noopener">View site <i class="bi bi-box-arrow-up-right small"></i></a>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-3">
            <span class="small text-white-50 d-none d-md-inline">{{ auth.email() }}</span>
            <button type="button" class="btn btn-sm btn-outline-light" (click)="signOut()">Sign out</button>
          </div>
        </div>
      </nav>
      <main class="container-xl py-4 py-lg-5">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/admin/login']);
  }
}
