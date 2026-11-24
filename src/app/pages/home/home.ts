import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Project } from '../../data/models';
import { ProjectsService } from '../../data/projects.service';
import { SERVICES, VALUES } from '../../data/services.data';
import { CtaBand } from '../../shared/cta-band';
import { injectMasonryColumns } from '../../shared/masonry';
import { ProjectCard } from '../../shared/project-card';
import { SectionHeading } from '../../shared/section-heading';
import { toColumns } from '../../shared/utils/masonry';

@Component({
  selector: 'app-home',
  imports: [RouterLink, SectionHeading, ProjectCard, CtaBand],
  templateUrl: './home.html',
})
export class Home {
  private readonly projects = inject(ProjectsService);

  protected readonly services = SERVICES;
  protected readonly values = VALUES;
  protected readonly trust = [
    { icon: 'bi-patch-check', label: 'Trained professionals' },
    { icon: 'bi-chat-dots', label: 'Clear communication' },
    { icon: 'bi-search', label: 'Attention to detail' },
    { icon: 'bi-clock-history', label: 'On-time delivery' },
  ];

  protected readonly featured = signal<Project[]>([]);
  private readonly columnCount = injectMasonryColumns();
  protected readonly featuredColumns = computed(() =>
    toColumns(this.featured(), this.columnCount()),
  );
  protected readonly loading = signal(true);

  constructor() {
    this.projects
      .listFeatured(6)
      .then((p) => this.featured.set(p))
      .catch((e) => console.warn('Could not load featured projects', e))
      .finally(() => this.loading.set(false));
  }
}
