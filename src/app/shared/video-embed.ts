import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MediaAspect, ratioClass } from '../data/models';
import { parseVideoUrl } from './utils/video-url';

/** Embeds a YouTube, Vimeo or Facebook video. Only URLs rebuilt by parseVideoUrl are trusted. */
@Component({
  selector: 'app-video-embed',
  template: `
    @if (src(); as safe) {
      <div class="ex-media-frame" [class.ex-media-frame--portrait]="portrait()">
        <div class="ratio" [class]="ratio()">
          <iframe
            [src]="safe"
            [title]="title()"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    } @else {
      <a [href]="url()" target="_blank" rel="noopener">Watch the video <i class="bi bi-box-arrow-up-right"></i></a>
    }
  `,
})
export class VideoEmbed {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly aspect = input<MediaAspect>('16:9');
  readonly title = input('Project video');

  protected readonly ratio = computed(() => ratioClass(this.aspect()));
  protected readonly portrait = computed(() => this.aspect() === '9:16' || this.aspect() === '4:5');
  protected readonly src = computed(() => {
    const parsed = parseVideoUrl(this.url());
    return parsed ? this.sanitizer.bypassSecurityTrustResourceUrl(parsed.embedUrl) : null;
  });
}
