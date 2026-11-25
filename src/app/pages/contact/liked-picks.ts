import { Component, input, model } from '@angular/core';

/** Optional "What did you like about it?" checkboxes, shown when a project is attached. */
@Component({
  selector: 'app-liked-picks',
  template: `
    <fieldset class="ex-picks">
      <legend>
        What did you like about it? <span class="text-body-secondary">(optional)</span>
      </legend>
      <div class="ex-picks__grid">
        @for (o of options(); track o; let i = $index) {
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              [id]="'liked-' + i"
              [checked]="selected().includes(o)"
              (change)="toggle(o, $event)"
            />
            <label class="form-check-label" [for]="'liked-' + i">{{ o }}</label>
          </div>
        }
      </div>
    </fieldset>
  `,
})
export class LikedPicks {
  readonly options = input.required<readonly string[]>();
  readonly selected = model<string[]>([]);

  protected toggle(option: string, event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    const picked = new Set(this.selected());
    if (on) picked.add(option);
    else picked.delete(option);
    // Keep the options' order, not the click order.
    this.selected.set(this.options().filter((o) => picked.has(o)));
  }
}
