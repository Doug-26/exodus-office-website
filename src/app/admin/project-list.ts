import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { categoryInfo, Project } from '../data/models';
import { ProjectsService } from '../data/projects.service';

@Component({
  selector: 'app-project-list',
  imports: [RouterLink],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Projects</h1>
        <p class="text-body-secondary mb-0 small">Only <strong>published</strong> projects appear on the website. <strong>Featured</strong> ones also show on the home page.</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/projects/new"><i class="bi bi-plus-lg me-1" aria-hidden="true"></i> New project</a>
    </div>

    @if (error()) {
      <div class="alert alert-danger" role="alert">{{ error() }}</div>
    }

    @if (loading()) {
      <div class="text-center py-5"><span class="spinner-border text-primary" role="status" aria-label="Loading"></span></div>
    } @else if (!projects().length) {
      <div class="ex-empty bg-white">
        <i class="bi bi-collection d-block mb-3" aria-hidden="true"></i>
        <h2 class="h5 text-body">No projects yet</h2>
        <p>Add your first video, reel, or design to start building the portfolio.</p>
        <a class="btn btn-primary" routerLink="/admin/projects/new">Add a project</a>
      </div>
    } @else {
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col" style="width: 5.5rem">Order</th>
                <th scope="col">Project</th>
                <th scope="col">Category</th>
                <th scope="col" class="text-center">Featured</th>
                <th scope="col" class="text-center">Published</th>
                <th scope="col" class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of projects(); track p.id; let first = $first; let last = $last; let i = $index) {
                <tr>
                  <td>
                    <div class="btn-group-vertical btn-group-sm">
                      <button type="button" class="btn btn-light" [disabled]="first || busy()" (click)="move(i, -1)" [attr.aria-label]="'Move ' + p.title + ' up'"><i class="bi bi-chevron-up" aria-hidden="true"></i></button>
                      <button type="button" class="btn btn-light" [disabled]="last || busy()" (click)="move(i, 1)" [attr.aria-label]="'Move ' + p.title + ' down'"><i class="bi bi-chevron-down" aria-hidden="true"></i></button>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-3">
                      <div class="ex-thumb">
                        @if (svc.coverUrl(p); as src) {
                          <img [src]="src" alt="" loading="lazy" />
                        } @else if (svc.previewVideoUrl(p); as video) {
                          <video [src]="video" muted playsinline preload="metadata" aria-hidden="true"></video>
                        } @else {
                          <i class="bi bi-image" aria-hidden="true"></i>
                        }
                      </div>
                      <div>
                        <a class="fw-semibold" [routerLink]="['/admin/projects', p.id]">{{ p.title }}</a>
                        <div class="small text-body-secondary">/portfolio/{{ p.slug }} · {{ p.project_media?.length ?? 0 }} media</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ label(p) }}</td>
                  <td class="text-center">
                    <div class="form-check form-switch d-inline-block">
                      <input class="form-check-input" type="checkbox" role="switch" [checked]="p.is_featured" [disabled]="busy()" (change)="toggle(p, 'is_featured', $event)" [attr.aria-label]="'Feature ' + p.title" />
                    </div>
                  </td>
                  <td class="text-center">
                    <div class="form-check form-switch d-inline-block">
                      <input class="form-check-input" type="checkbox" role="switch" [checked]="p.is_published" [disabled]="busy()" (change)="toggle(p, 'is_published', $event)" [attr.aria-label]="'Publish ' + p.title" />
                    </div>
                  </td>
                  <td class="text-end text-nowrap">
                    @if (p.is_published) {
                      <a class="btn btn-sm btn-light" [routerLink]="['/portfolio', p.slug]" target="_blank" rel="noopener" [attr.aria-label]="'View ' + p.title + ' on site (opens in new tab)'"><i class="bi bi-eye" aria-hidden="true"></i></a>
                    }
                    <a class="btn btn-sm btn-light ms-1" [routerLink]="['/admin/projects', p.id]" [attr.aria-label]="'Edit ' + p.title"><i class="bi bi-pencil" aria-hidden="true"></i></a>
                    <button type="button" class="btn btn-sm btn-light text-danger ms-1" [disabled]="busy()" (click)="remove(p)" [attr.aria-label]="'Delete ' + p.title"><i class="bi bi-trash" aria-hidden="true"></i></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class ProjectList {
  protected readonly svc = inject(ProjectsService);

  protected readonly projects = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  protected label(p: Project): string {
    return categoryInfo(p.category).label;
  }

  private async load(): Promise<void> {
    try {
      this.projects.set(await this.svc.listAll());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggle(p: Project, field: 'is_featured' | 'is_published', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const ok = await this.run(async () => {
      const updated = await this.svc.update(p.id, { [field]: !p[field] });
      this.projects.update((list) => list.map((x) => (x.id === p.id ? { ...x, ...updated, project_media: x.project_media } : x)));
    });
    if (!ok) input.checked = p[field];
  }

  protected async move(index: number, delta: number): Promise<void> {
    const list = [...this.projects()];
    const target = index + delta;
    [list[index], list[target]] = [list[target], list[index]];
    this.projects.set(list);
    await this.run(() => this.svc.saveOrder(list.map((p) => p.id)));
  }

  protected async remove(p: Project): Promise<void> {
    if (!confirm(`Delete "${p.title}" and all of its media? This cannot be undone.`)) return;
    await this.run(async () => {
      await this.svc.remove(p);
      this.projects.update((list) => list.filter((x) => x.id !== p.id));
    });
  }

  /** Runs an action with a busy flag; returns false (and reloads) if it failed. */
  private async run(action: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      return true;
    } catch (e) {
      this.error.set((e as Error).message);
      await this.load();
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
