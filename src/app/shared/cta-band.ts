import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cta-band',
  imports: [RouterLink],
  template: `
    <section class="ex-section pt-0">
      <div class="container">
        <div class="ex-cta d-lg-flex align-items-center justify-content-between gap-5">
          <div class="mb-4 mb-lg-0">
            <h2 class="display-6 mb-2">{{ heading() }}</h2>
            <p class="mb-0 fs-5">{{ text() }}</p>
          </div>
          <a routerLink="/contact" class="btn btn-warning btn-lg flex-shrink-0">
            Let's talk <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </section>
  `,
})
export class CtaBand {
  readonly heading = input('Focus on what matters most.');
  readonly text = input('We will take care of the rest. Tell us what your business needs.');
}
