import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Inquiry, InquiryStatus } from '../data/models';
import { InquiriesService } from '../data/inquiries.service';

type Filter = InquiryStatus | 'all';

@Component({
  selector: 'app-inquiries',
  imports: [DatePipe],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Inquiries</h1>
        <p class="text-body-secondary small mb-0">Messages sent through the website's contact form.</p>
      </div>
      <div class="btn-group" role="group" aria-label="Filter inquiries">
        @for (f of filters; track f.value) {
          <button type="button" class="btn btn-sm" [class.btn-primary]="filter() === f.value" [class.btn-outline-primary]="filter() !== f.value" (click)="filter.set(f.value)">
            {{ f.label }}
            @if (f.value === 'new' && newCount()) {
              <span class="badge text-bg-warning ms-1">{{ newCount() }}</span>
            }
          </button>
        }
      </div>
    </div>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    @if (loading()) {
      <div class="text-center py-5"><span class="spinner-border text-primary" role="status" aria-label="Loading"></span></div>
    } @else if (!visible().length) {
      <div class="ex-empty bg-white">
        <i class="bi bi-inbox d-block mb-3"></i>
        <p class="mb-0">No {{ filter() === 'all' ? '' : filter() }} inquiries.</p>
      </div>
    } @else {
      <div class="d-grid gap-3">
        @for (q of visible(); track q.id) {
          <article class="card border-0 shadow-sm ex-inquiry" [class.is-new]="q.status === 'new'">
            <div class="card-body p-4">
              <button type="button" class="btn p-0 w-100 text-start border-0" (click)="toggle(q)" [attr.aria-expanded]="openId() === q.id">
                <div class="d-flex flex-wrap justify-content-between gap-2">
                  <div>
                    <strong>{{ q.name }}</strong>
                    <span class="text-body-secondary ms-2 small">{{ q.email }}</span>
                    @if (q.service) {
                      <span class="badge ex-badge-cat ms-2">{{ q.service }}</span>
                    }
                  </div>
                  <span class="small text-body-secondary">{{ q.created_at | date: 'medium' }}</span>
                </div>
                @if (openId() !== q.id) {
                  <p class="text-body-secondary small mb-0 mt-2 text-truncate">{{ q.message }}</p>
                }
              </button>

              @if (openId() === q.id) {
                <p class="ex-prose mt-3">{{ q.message }}</p>
                <div class="d-flex flex-wrap gap-2">
                  <a class="btn btn-sm btn-primary" [href]="replyLink(q)"><i class="bi bi-reply me-1"></i>Reply by email</a>
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

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'read', label: 'Read' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All' },
  ];

  protected readonly all = signal<Inquiry[]>([]);
  protected readonly filter = signal<Filter>('new');
  protected readonly openId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly newCount = computed(() => this.all().filter((q) => q.status === 'new').length);
  protected readonly visible = computed(() => {
    const f = this.filter();
    const open = this.openId();
    return f === 'all' ? this.all() : this.all().filter((q) => q.status === f || q.id === open);
  });

  constructor() {
    this.svc
      .list()
      .then((list) => {
        this.all.set(list);
        if (!list.some((q) => q.status === 'new')) this.filter.set('all');
      })
      .catch((e: Error) => this.error.set(e.message))
      .finally(() => this.loading.set(false));
  }

  protected replyLink(q: Inquiry): string {
    const subject = encodeURIComponent(`Re: Your inquiry to Exodus Home Office${q.service ? ` (${q.service})` : ''}`);
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
