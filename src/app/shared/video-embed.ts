import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MediaAspect, ratioClass } from '../data/models';
import { parseVideoUrl, VIDEO_PROVIDER_LABELS } from './utils/video-url';

/**
 * Embeds a YouTube, Vimeo or Facebook video. Only URLs rebuilt by parseVideoUrl are trusted.
 *
 * Shows a lightweight "click to play" preview first: each provider's player pulls in
 * roughly 0.5–1 MB of script, so the iframe is only created when the visitor asks for it.
 */
@Component({
  selector: 'app-video-embed',
  template: `
    @if (parsed(); as video) {
      <div class="ex-media-frame" [class.ex-media-frame--portrait]="portrait()">
        <div class="ratio" [class]="ratio()">
          @if (src(); as safe) {
            <iframe
              #frame
              [src]="safe"
              [title]="title()"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          } @else {
            <button
              type="button"
              class="ex-embed-facade"
              (click)="playing.set(true)"
              [attr.aria-label]="'Play video: ' + title()"
            >
              @if (video.thumbnailUrl) {
                <img [src]="video.thumbnailUrl" alt="" loading="lazy" decoding="async" />
              } @else {
                <span class="ex-embed-facade__brand" aria-hidden="true">
                  <i class="bi bi-{{ video.provider }}"></i>
                  {{ providerLabel() }}
                </span>
              }
              <span class="ex-play ex-play--center" aria-hidden="true"
                ><i class="bi bi-play-fill"></i
              ></span>
            </button>
          }
        </div>
      </div>
      @if (video.provider === 'facebook') {
        <!-- Browsers' tracking protection and ad blockers often block Facebook frames; give a way out. -->
        <p class="small text-center text-body-secondary mt-2 mb-0">
          Video not loading?
          <a [href]="video.watchUrl" target="_blank" rel="noopener">
            Watch on Facebook <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i
            ><span class="visually-hidden"> (opens in new tab)</span>
          </a>
        </p>
      }
    } @else {
      <a [href]="url()" target="_blank" rel="noopener"
        >Watch the video <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i
        ><span class="visually-hidden"> (opens in new tab)</span></a
      >
    }
  `,
})
export class VideoEmbed {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly aspect = input<MediaAspect>('16:9');
  readonly title = input('Project video');

  /** Becomes true when the visitor clicks play (reset for a new URL); only then is the iframe created. */
  protected readonly playing = linkedSignal(() => {
    this.url();
    return false;
  });
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  protected readonly ratio = computed(() => ratioClass(this.aspect()));
  protected readonly portrait = computed(() => this.aspect() === '9:16' || this.aspect() === '4:5');
  protected readonly parsed = computed(() => parseVideoUrl(this.url()));
  protected readonly providerLabel = computed(() => {
    const provider = this.parsed()?.provider;
    return provider ? VIDEO_PROVIDER_LABELS[provider] : '';
  });
  protected readonly src = computed(() => {
    const parsed = this.parsed();
    return parsed && this.playing()
      ? this.sanitizer.bypassSecurityTrustResourceUrl(parsed.autoplayUrl)
      : null;
  });

  constructor() {
    // The play button disappears on click, so hand keyboard focus to the player.
    effect(() => this.frame()?.nativeElement.focus());
  }
}
