import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="ex-section">
      <div class="container text-center" style="max-width: 36rem">
        <span class="ex-eyebrow">Error 404</span>
        <h1 class="display-5 mb-3">We couldn't find that page</h1>
        <p class="ex-lead mb-4">The page may have moved, or the link may be incorrect.</p>
        <div class="d-flex justify-content-center gap-3">
          <a routerLink="/" class="btn btn-primary">Go home</a>
          <a routerLink="/portfolio" class="btn btn-outline-primary">See our work</a>
        </div>
      </div>
    </section>
  `,
})
export class NotFound {}
