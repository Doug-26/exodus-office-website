import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, Project, ProjectCategory } from '../../data/models';
import { ProjectsService } from '../../data/projects.service';
import { injectMasonryColumns } from '../../shared/masonry';
import { PageHeader } from '../../shared/page-header';
import { ProjectCard } from '../../shared/project-card';
import { toColumns } from '../../shared/utils/masonry';

/** Projects rendered per batch: a multiple of 1, 2 and 3 columns. */
const PAGE_SIZE = 12;

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink, PageHeader, ProjectCard],
  template: `
    <app-page-header
      eyebrow="Portfolio"
      heading="Work we're proud of"
      subtitle="Social media content, videos, reels, and designs created by the Exodus Home Office team."
    />

    <section class="ex-section pt-5">
      <div class="container">
        @if (filters().length > 1) {
          <div class="ex-filter mb-5" role="group" aria-label="Filter projects by category">
            <button
              type="button"
              class="ex-chip"
              [class.active]="active() === 'all'"
              [attr.aria-pressed]="active() === 'all'"
              (click)="active.set('all')"
            >
              All
            </button>
            @for (c of filters(); track c.value) {
              <button
                type="button"
                class="ex-chip"
                [class.active]="active() === c.value"
                [attr.aria-pressed]="active() === c.value"
                (click)="active.set(c.value)"
              >
                <i class="bi {{ c.icon }} me-1" aria-hidden="true"></i>{{ c.label }}
              </button>
            }
          </div>
        }

        @if (loading()) {
          <div class="ex-masonry">
            @for (col of skeletonColumns(); track $index) {
              <div class="ex-masonry-col">
                @for (h of col; track $index) {
                  <div class="ex-skeleton" [style.height.rem]="h"></div>
                }
              </div>
            }
          </div>
        } @else if (error()) {
          <div class="alert alert-danger" role="alert">{{ error() }}</div>
        } @else if (visible().length) {
          <div class="ex-masonry">
            @for (col of columns(); track $index) {
              <div class="ex-masonry-col">
                @for (p of col; track p.id; let first = $first) {
                  <app-project-card [project]="p" [eager]="first" />
                }
              </div>
            }
          </div>
          @if (remaining()) {
            <div class="text-center mt-5">
              <button type="button" class="btn btn-outline-primary" (click)="showMore()">
                Show more projects ({{ remaining() }} more)
              </button>
            </div>
          }
        } @else {
          <div class="ex-empty">
            <i class="bi bi-collection-play d-block mb-3" aria-hidden="true"></i>
            <h2 class="h4 text-body">New projects coming soon</h2>
            <p class="mb-4">
              We're putting together our latest work. In the meantime, we'd love to hear about your
              project.
            </p>
            <a routerLink="/contact" class="btn btn-primary">Get in touch</a>
          </div>
        }
      </div>
    </section>
  `,
})
export class Portfolio {
  private readonly projects = inject(ProjectsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly all = signal<Project[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal<ProjectCategory | 'all'>('all');

  /** Only show filter chips for categories that actually have projects. */
  protected readonly filters = computed(() =>
    CATEGORIES.filter((c) => this.all().some((p) => p.category === c.value)),
  );
  protected readonly visible = computed(() => {
    const a = this.active();
    return a === 'all' ? this.all() : this.all().filter((p) => p.category === a);
  });

  /**
   * How many projects are rendered. Cards (and their images) are added in batches so a large
   * portfolio doesn't load everything at once; switching filters starts over.
   */
  private readonly shown = linkedSignal(() => {
    this.active();
    return PAGE_SIZE;
  });
  protected readonly remaining = computed(() => Math.max(0, this.visible().length - this.shown()));

  private readonly columnCount = injectMasonryColumns();
  protected readonly columns = computed(() =>
    toColumns(this.visible().slice(0, this.shown()), this.columnCount()),
  );
  protected readonly skeletonColumns = computed(() =>
    toColumns([16, 22, 18, 20, 16, 24], this.columnCount()),
  );

  constructor() {
    this.projects
      .listPublished()
      .then((p) => this.all.set(p))
      .catch((e: Error) => this.error.set(e.message))
      .finally(() => this.loading.set(false));
  }

  /** Renders the next batch and moves keyboard focus to its first card. */
  protected showMore(): void {
    const next = this.visible()[this.shown()];
    this.shown.update((n) => n + PAGE_SIZE);
    if (!next) return;
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>(`a[href="/portfolio/${next.slug}"]`)
          ?.focus(),
      { injector: this.injector },
    );
  }
}
