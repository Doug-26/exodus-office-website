import {
  ApplicationConfig,
  DOCUMENT,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './core/seo';
import { isChunkLoadError, reloadForFreshChunks } from './shared/utils/chunk-error';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      // After a deploy, an open tab still points at the old (deleted) lazy chunks, so clicking
      // a link silently fails. Do a full page load instead, which picks up the new build.
      withNavigationErrorHandler((e) => {
        const win = inject(DOCUMENT).defaultView;
        if (win && isChunkLoadError(e.error)) reloadForFreshChunks(e.url, win);
      }),
    ),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
  ],
};
