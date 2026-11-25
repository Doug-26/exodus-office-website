import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectThumb } from '../shared/project-thumb';
import { ProjectRef } from '../shared/utils/inquiry-project';

/** The project an inquiry is about, shown when the inquiry is opened. */
@Component({
  selector: 'app-inquiry-project',
  imports: [RouterLink, ProjectThumb],
  host: { class: 'ex-ref' },
  template: `
    @if (ref().project; as p) {
      <app-project-thumb [project]="p" size="lg" />
    } @else {
      <span class="ex-thumb ex-thumb--lg"><i class="bi bi-image" aria-hidden="true"></i></span>
    }
    <div class="ex-ref__body">
      <p class="ex-ref__label">Wants something like</p>
      <p class="fw-semibold mb-0">
        {{ ref().title }}
        @if (ref().state === 'unpublished') {
          <span class="badge text-bg-secondary ms-1">Not published</span>
        }
      </p>
      @if (ref().sentTitle; as old) {
        <p class="small text-body-secondary mb-0">Titled “{{ old }}” when this was sent</p>
      }
      @if (ref().state === 'deleted') {
        <p class="small text-body-secondary mb-0">This project has since been deleted.</p>
      } @else if (ref().state === 'unresolved') {
        <p class="small text-body-secondary mb-0">The project details couldn't be loaded.</p>
      }
      @if (ref().viewSlug || ref().editId) {
        <div class="d-flex flex-wrap gap-2 mt-2">
          @if (ref().viewSlug; as slug) {
            <a
              class="btn btn-sm btn-light"
              [routerLink]="['/portfolio', slug]"
              target="_blank"
              rel="noopener"
              aria-label="View on site (opens in new tab)"
            >
              <i class="bi bi-eye me-1" aria-hidden="true"></i>View on site
            </a>
          }
          @if (ref().editId; as id) {
            <a class="btn btn-sm btn-light" [routerLink]="['/admin/projects', id]">
              <i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit project
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class InquiryProject {
  readonly ref = input.required<ProjectRef>();
}
