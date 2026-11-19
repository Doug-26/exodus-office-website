import { booleanAttribute, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  template: `
    <div [class.text-center]="center()" [class.mx-auto]="center()" [style.max-width]="center() ? '44rem' : null">
      @if (eyebrow()) {
        <span class="ex-eyebrow">{{ eyebrow() }}</span>
      }
      <h2 class="display-6 mb-3">{{ heading() }}</h2>
      @if (subtitle()) {
        <p class="ex-lead mb-0">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class SectionHeading {
  readonly eyebrow = input<string>();
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
  readonly center = input(false, { transform: booleanAttribute });
}
