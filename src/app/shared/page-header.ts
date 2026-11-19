import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="ex-page-header">
      <div class="container">
        @if (eyebrow()) {
          <span class="ex-eyebrow ex-eyebrow--light">{{ eyebrow() }}</span>
        }
        <h1 class="display-5 mb-3">{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="lead mb-0">{{ subtitle() }}</p>
        }
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly eyebrow = input<string>();
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
