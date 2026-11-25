import { DestroyRef, Directive, effect, ElementRef, inject, input, signal } from '@angular/core';

/** Called when an observed <video> comes near the viewport. */
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | undefined;

function sharedObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) callbacks.get(entry.target)?.();
      }
    },
    { rootMargin: '200px' },
  );
  return observer;
}

/**
 * `<video [appLazySrc]="url">`: sets the video's `src` (with `preload="metadata"`) only once it
 * comes near the viewport. Videos have no native `loading="lazy"`, so without this every
 * video on a page starts downloading at once. Prefer a poster image where one exists.
 */
@Directive({ selector: 'video[appLazySrc]' })
export class LazyVideo {
  readonly src = input.required<string>({ alias: 'appLazySrc' });

  private readonly video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly near = signal(typeof IntersectionObserver === 'undefined');

  constructor() {
    this.video.preload = 'none';

    if (!this.near()) {
      const io = sharedObserver();
      const stop = () => {
        io.unobserve(this.video);
        callbacks.delete(this.video);
      };
      callbacks.set(this.video, () => {
        stop();
        this.near.set(true);
      });
      io.observe(this.video);
      inject(DestroyRef).onDestroy(stop);
    }

    effect(() => {
      const src = this.src();
      if (!this.near() || this.video.getAttribute('src') === src) return;
      this.video.preload = 'metadata';
      this.video.src = src;
    });
  }
}
