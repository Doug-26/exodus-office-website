import { Component, DestroyRef, effect, ElementRef, inject, input, model, viewChild } from '@angular/core';

export interface LightboxImage {
  src: string;
  alt: string;
}

/** Full-screen image viewer. `index` is two-way bound; null means closed. */
@Component({
  selector: 'app-lightbox',
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    @if (current(); as img) {
      <div class="ex-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" (click)="close()">
        <img [src]="img.src" [alt]="img.alt" (click)="$event.stopPropagation()" />
        <button #closeBtn class="ex-lightbox__btn ex-lightbox__btn--close" type="button" aria-label="Close" (click)="close()">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        @if (images().length > 1) {
          <button class="ex-lightbox__btn ex-lightbox__btn--prev" type="button" aria-label="Previous image" (click)="step(-1, $event)">
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>
          <button class="ex-lightbox__btn ex-lightbox__btn--next" type="button" aria-label="Next image" (click)="step(1, $event)">
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
          <span class="ex-lightbox__count">{{ (index() ?? 0) + 1 }} / {{ images().length }}</span>
        }
      </div>
    }
  `,
})
export class Lightbox {
  readonly images = input.required<LightboxImage[]>();
  readonly index = model<number | null>(null);

  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  constructor() {
    inject(DestroyRef).onDestroy(() => (document.body.style.overflow = ''));
    effect(() => {
      const isOpen = this.index() !== null;
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen) this.closeBtn()?.nativeElement.focus();
    });
  }

  protected current(): LightboxImage | null {
    const i = this.index();
    return i === null ? null : (this.images()[i] ?? null);
  }

  protected close(): void {
    this.index.set(null);
  }

  protected step(delta: number, event?: Event): void {
    event?.stopPropagation();
    const n = this.images().length;
    const i = this.index();
    if (i === null || !n) return;
    this.index.set((i + delta + n) % n);
  }

  protected onKey(e: KeyboardEvent): void {
    if (this.index() === null) return;
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
  }
}
