import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { categoryInfo, Project, ratioClass } from '../data/models';
import { ProjectsService } from '../data/projects.service';
import { LazyVideo } from './lazy-video';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink, LazyVideo],
  template: `
    <a class="ex-project-card" [routerLink]="['/portfolio', project().slug]">
      <div class="ex-project-card__media ratio" [class]="ratio()">
        @if (cover(); as src) {
          <img
            [src]="src"
            [alt]="project().title"
            [attr.loading]="eager() ? 'eager' : 'lazy'"
            [attr.fetchpriority]="eager() ? 'high' : null"
            decoding="async"
          />
        } @else if (previewVideo(); as video) {
          <video [appLazySrc]="video" muted playsinline tabindex="-1" aria-hidden="true"></video>
        } @else {
          <div class="ex-project-card__placeholder">
            <i class="bi {{ category().icon }}" aria-hidden="true"></i>
          </div>
        }
        @if (hasVideo()) {
          <span class="ex-play" aria-hidden="true"><i class="bi bi-play-fill"></i></span>
        }
      </div>
      <div class="ex-project-card__body">
        <span class="badge ex-badge-cat">{{ category().label }}</span>
        <h3 [title]="project().title">{{ project().title }}</h3>
        @if (project().client_name) {
          <p class="small text-body-secondary mb-0">for {{ project().client_name }}</p>
        }
      </div>
    </a>
  `,
})
export class ProjectCard {
  private readonly projects = inject(ProjectsService);

  readonly project = input.required<Project>();
  /** Cards in the first visible row: load the image right away (it's likely the LCP). */
  readonly eager = input(false);

  protected readonly cover = computed(() => this.projects.coverUrl(this.project()));
  protected readonly previewVideo = computed(() => this.projects.previewVideoUrl(this.project()));
  protected readonly hasVideo = computed(() => this.projects.hasVideo(this.project()));
  protected readonly category = computed(() => categoryInfo(this.project().category));
  /** Vertical work (reels) gets a portrait card; everything else stays landscape. */
  protected readonly ratio = computed(() => {
    const first = this.project().project_media?.[0];
    const aspect = first?.aspect === '9:16' || first?.aspect === '4:5' ? '4:5' : first?.aspect === '1:1' ? '1:1' : '16:9';
    return ratioClass(aspect);
  });
}
