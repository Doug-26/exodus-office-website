import { Component, computed, input, output } from '@angular/core';
import { categoryInfo, Project } from '../../data/models';
import { ProjectThumb } from '../../shared/project-thumb';

/** "You're asking about <project>" card at the top of the contact form. */
@Component({
  selector: 'app-project-reference',
  imports: [ProjectThumb],
  host: { class: 'ex-ref', role: 'group', 'aria-labelledby': 'project-ref-label' },
  template: `
    <app-project-thumb [project]="project()" size="lg" [icon]="category().icon" />
    <div class="ex-ref__body">
      <p id="project-ref-label" class="ex-ref__label">You're asking about</p>
      <p class="fw-semibold mb-0">{{ project().title }}</p>
      <p class="small text-body-secondary mb-0">{{ category().label }}</p>
    </div>
    <button
      type="button"
      class="btn btn-sm btn-outline-secondary"
      [attr.aria-label]="'Remove ' + project().title + ' from your message'"
      (click)="removed.emit()"
    >
      Remove
    </button>
  `,
})
export class ProjectReference {
  readonly project = input.required<Project>();
  readonly removed = output<void>();

  protected readonly category = computed(() => categoryInfo(this.project().category));
}
