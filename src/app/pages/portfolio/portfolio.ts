import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, Project, ProjectCategory } from '../../data/models';
import { ProjectsService } from '../../data/projects.service';
import { injectMasonryColumns } from '../../shared/masonry';
import { PageHeader } from '../../shared/page-header';
import { ProjectCard } from '../../shared/project-card';
import { toColumns } from '../../shared/utils/masonry';

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
                @for (p of col; track p.id) {
                  <app-project-card [project]="p" />
                }
              </div>
            }
          </div>
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

  private readonly columnCount = injectMasonryColumns();
  protected readonly columns = computed(() => toColumns(this.visible(), this.columnCount()));
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
}
