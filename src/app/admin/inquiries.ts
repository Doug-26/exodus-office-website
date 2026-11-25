import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Inquiry, InquiryStatus, Project } from '../data/models';
import { InquiriesService } from '../data/inquiries.service';
import { ProjectsService } from '../data/projects.service';
import { projectRef, replySubject } from '../shared/utils/inquiry-project';
import { SITE } from '../site.config';
import { InquiryProject } from './inquiry-project';

type Filter = InquiryStatus | 'all';

@Component({
  selector: 'app-inquiries',
  imports: [DatePipe, RouterLink, InquiryProject],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Inquiries</h1>
        <p class="text-body-secondary small mb-0">Messages sent through the website's contact form.</p>
      </div>
      <div class="btn-group" role="group" aria-label="Filter inquiries">
        @for (f of filters; track f.value) {
          <button type="button" class="btn btn-sm" [class.btn-primary]="filter() === f.value" [class.btn-outline-primary]="filter() !== f.value" [attr.aria-pressed]="filter() === f.value" (click)="filter.set(f.value)">
            {{ f.label }}
            @if (f.value === 'new' && newCount()) {
              <span class="badge text-bg-warning ms-1">{{ newCount() }}</span>
            }
          </button>
        }
      </div>
    </div>

    @if (projectFilter()) {
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span class="small">Showing inquiries about <strong>{{ filterTitle() }}</strong></span>
        <a class="btn btn-sm btn-light" routerLink="/admin/inquiries"><i class="bi bi-x-lg me-1" aria-hidden="true"></i>Clear</a>
      </div>
    }

    @if (error()) {
      <div class="alert alert-danger" role="alert">{{ error() }}</div>
    }

    @if (loading()) {
      <div class="text-center py-5"><span class="spinner-border text-primary" role="status" aria-label="Loading"></span></div>
    } @else if (!visible().length) {
      <div class="ex-empty bg-white">
        <i class="bi bi-inbox d-block mb-3" aria-hidden="true"></i>
        <p class="mb-0">No {{ filter() === 'all' ? '' : filter() }} inquiries.</p>
      </div>
    } @else {
      <div class="d-grid gap-3">
        @for (q of visible(); track q.id) {
          <article class="card border-0 shadow-sm ex-inquiry" [class.is-new]="q.status === 'new'">
            <div class="card-body p-4">
              <button type="button" class="btn p-0 w-100 text-start border-0" (click)="toggle(q)" [attr.aria-expanded]="openId() === q.id">
                <span class="d-flex flex-wrap justify-content-between gap-2">
                  <span>
                    <strong>{{ q.name }}</strong>
                    <span class="text-body-secondary ms-2 small">{{ q.email }}</span>
                    @if (q.service) {
                      <span class="badge ex-badge-cat ms-2">{{ q.service }}</span>
                    }
                    @if (refs().get(q.id); as r) {
                      <span class="badge ex-badge-ref ms-2"><span class="visually-hidden">About project: </span><span aria-hidden="true">Re: </span>{{ r.title }}</span>
                    }
                  </span>
                  <span class="small text-body-secondary">{{ q.created_at | date: 'medium' }}</span>
                </span>
                @if (openId() !== q.id) {
                  <span class="d-block text-body-secondary small mt-2 text-truncate">{{ q.message }}</span>
                }
              </button>

              @if (openId() === q.id) {
                @if (refs().get(q.id); as r) {
                  <app-inquiry-project class="mt-3" [ref]="r" />
                }
                @if (q.liked?.length || q.timeline) {
                  <dl class="ex-inquiry__facts mt-3 mb-0">
                    @if (q.liked?.length) {
                      <dt>Liked</dt>
                      <dd>
                        @for (l of q.liked ?? []; track l) {
                          <span class="ex-tool">{{ l }}</span>
                        }
                      </dd>
                    }
                    @if (q.timeline) {
                      <dt>Timeline</dt>
                      <dd>{{ q.timeline }}</dd>
                    }
                  </dl>
                }
                <p class="ex-prose mt-3">{{ q.message }}</p>
                <div class="d-flex flex-wrap gap-2">
                  <a class="btn btn-sm btn-primary" [href]="replyLink(q)"><i class="bi bi-reply me-1" aria-hidden="true"></i>Reply by email</a>
                  @if (q.status !== 'archived') {
                    <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy()" (click)="setStatus(q, 'archived')">Archive</button>
                  } @else {
                    <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy()" (click)="setStatus(q, 'read')">Move to inbox</button>
                  }
                  @if (q.status !== 'new') {
                    <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy()" (click)="setStatus(q, 'new')">Mark as new</button>
                  }
                  <button type="button" class="btn btn-sm btn-outline-danger ms-auto" [disabled]="busy()" (click)="remove(q)">Delete</button>
                </div>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class Inquiries {
  private readonly svc = inject(InquiriesService);
  private readonly projects = inject(ProjectsService);

  /** Optional `?project=<id>` from the project list's "N inquiries" link. */
  readonly projectFilter = input<string | undefined>(undefined, { alias: 'project' });

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'read', label: 'Read' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All' },
  ];

  protected readonly all = signal<Inquiry[]>([]);
  /** Projects referenced by the inquiries, by id. */
  private readonly byId = signal<ReadonlyMap<string, Project>>(new Map());
  protected readonly filter = signal<Filter>('new');
  protected readonly openId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly refs = computed(() => {
    const byId = this.byId();
    return new Map(this.all().map((q) => [q.id, projectRef(q, byId)]));
  });
  protected readonly newCount = computed(() => this.all().filter((q) => q.status === 'new').length);
  protected readonly visible = computed(() => {
    const f = this.filter();
    const open = this.openId();
    const project = this.projectFilter();
    const list = project ? this.all().filter((q) => q.project_id === project) : this.all();
    return f === 'all' ? list : list.filter((q) => q.status === f || q.id === open);
  });
  protected readonly filterTitle = computed(() => {
    const id = this.projectFilter();
    if (!id) return '';
    return this.byId().get(id)?.title ?? this.all().find((q) => q.project_id === id)?.project_title ?? 'this project';
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const list = await this.svc.list();
      this.all.set(list);
      if (this.projectFilter() || !list.some((q) => q.status === 'new')) this.filter.set('all');
      await this.loadProjects(list);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  /** Loads the referenced projects; if that fails the saved titles are shown instead. */
  private async loadProjects(list: Inquiry[]): Promise<void> {
    const ids = [...new Set(list.map((q) => q.project_id).filter((id): id is string => !!id))];
    try {
      const found = await this.projects.listByIds(ids);
      this.byId.set(new Map(found.map((p) => [p.id, p])));
    } catch {
      // Keep the snapshots.
    }
  }

  protected replyLink(q: Inquiry): string {
    const subject = encodeURIComponent(replySubject(q, SITE.name));
    return `mailto:${encodeURIComponent(q.email)}?subject=${subject}`;
  }

  protected toggle(q: Inquiry): void {
    const opening = this.openId() !== q.id;
    this.openId.set(opening ? q.id : null);
    // Opening a new message marks it as read (it stays visible until the filter changes).
    if (opening && q.status === 'new') void this.setStatus(q, 'read');
  }

  protected async setStatus(q: Inquiry, status: InquiryStatus): Promise<void> {
    await this.run(async () => {
      await this.svc.setStatus(q.id, status);
      this.all.update((list) => list.map((x) => (x.id === q.id ? { ...x, status } : x)));
    });
  }

  protected async remove(q: Inquiry): Promise<void> {
    if (!confirm(`Delete the message from ${q.name}? This cannot be undone.`)) return;
    await this.run(async () => {
      await this.svc.remove(q.id);
      this.all.update((list) => list.filter((x) => x.id !== q.id));
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
