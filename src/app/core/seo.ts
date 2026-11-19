import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SITE } from '../site.config';

export interface SeoData {
  title: string;
  description?: string;
  image?: string | null;
  noindex?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);

  set({ title, description, image, noindex }: SeoData): void {
    const fullTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
    const desc = description || SITE.description;

    this.titleSvc.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' });
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
    } else {
      this.meta.removeTag("property='og:image'");
    }
  }
}

/** Sets <title>, description and robots meta from each route's `title` and `data`. */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title === undefined) return;

    // `noindex` may be set on any ancestor (e.g. the whole /admin tree).
    let route = snapshot.root;
    let noindex = Boolean(route.data['noindex']);
    while (route.firstChild) {
      route = route.firstChild;
      noindex ||= Boolean(route.data['noindex']);
    }

    this.seo.set({
      title,
      description: route.data['description'] as string | undefined,
      noindex,
    });
  }
}
