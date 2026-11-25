import { Component, computed, inject, input } from '@angular/core';
import { Project } from '../data/models';
import { ProjectsService } from '../data/projects.service';
import { LazyVideo } from './lazy-video';

/** Small decorative project thumbnail: cover image → first video frame → icon. */
@Component({
  selector: 'app-project-thumb',
  imports: [LazyVideo],
  host: { class: 'ex-thumb', '[class.ex-thumb--lg]': "size() === 'lg'" },
  template: `
    @if (cover(); as src) {
      <img [src]="src" alt="" loading="lazy" decoding="async" />
    } @else if (video(); as src) {
      <video [appLazySrc]="src" muted playsinline aria-hidden="true"></video>
    } @else {
      <i class="bi {{ icon() }}" aria-hidden="true"></i>
    }
  `,
})
export class ProjectThumb {
  private readonly svc = inject(ProjectsService);

  readonly project = input.required<Project>();
  readonly size = input<'md' | 'lg'>('md');
  /** Bootstrap icon shown when the project has no image or video. */
  readonly icon = input('bi-image');

  protected readonly cover = computed(() => this.svc.coverUrl(this.project()));
  protected readonly video = computed(() => this.svc.previewVideoUrl(this.project()));
}
