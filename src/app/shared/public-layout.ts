import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './footer';
import { Navbar } from './navbar';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, Navbar, Footer],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <app-navbar />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <app-footer />
  `,
})
export class PublicLayout {}
