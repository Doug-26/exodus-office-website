import { DOCUMENT, inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SITE } from '../site.config';

export interface SeoData {
  title: string;
  description?: string;
  image?: string | null;
  noindex?: boolean;
  /** Router path (e.g. `/about`). When given, updates the canonical link and og:url. */
  path?: string;
}

@Service()
export class SeoService {
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  set({ title, description, image, noindex, path }: SeoData): void {
    const fullTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
    const desc = description || SITE.description;

    this.titleSvc.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow',
    });
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
    } else {
      this.meta.removeTag("property='og:image'");
    }
    if (noindex) {
      this.setCanonical(null);
    } else if (path !== undefined) {
      this.setCanonical(SITE.url + path.split(/[?#]/)[0]);
    }
  }

  /** Points search engines at the custom domain, even when the page is served from *.pages.dev. */
  private setCanonical(href: string | null): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!href) {
      link?.remove();
      this.meta.removeTag("property='og:url'");
      return;
    }
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = href;
    this.meta.updateTag({ property: 'og:url', content: href });
  }
}

/** Sets <title>, description and robots meta from each route's `title` and `data`. */
@Service()
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
      path: snapshot.url,
    });
  }
}
