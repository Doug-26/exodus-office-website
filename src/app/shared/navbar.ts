import { NgOptimizedImage } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SITE } from '../site.config';

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg sticky-top ex-navbar py-3" aria-label="Main navigation">
      <div class="container">
        <a class="ex-brand" routerLink="/" aria-label="{{ site.name }}, home">
          <img ngSrc="logo.svg" alt="" width="40" height="40" priority />
          <span>
            <span class="ex-brand__name">Exodus</span>
            <span class="ex-brand__sub">Home Office</span>
          </span>
        </a>

        <button
          class="navbar-toggler border-0 shadow-none"
          type="button"
          (click)="open.set(!open())"
          [attr.aria-expanded]="open()"
          aria-controls="mainNav"
          aria-label="Toggle navigation"
        >
          <i class="bi fs-2" [class.bi-list]="!open()" [class.bi-x-lg]="open()" aria-hidden="true"></i>
        </button>

        <div class="collapse navbar-collapse" id="mainNav" [class.show]="open()">
          <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1 pt-3 pt-lg-0">
            @for (link of links; track link.path) {
              <li class="nav-item">
                <a
                  class="nav-link"
                  [routerLink]="link.path"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                  >{{ link.label }}</a
                >
              </li>
            }
            <li class="nav-item ms-lg-3 mt-2 mt-lg-0">
              <a class="btn btn-primary" routerLink="/contact">Work with us</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `,
})
export class Navbar {
  protected readonly site = SITE;
  protected readonly open = signal(false);
  protected readonly links = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/services', label: 'Services' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/contact', label: 'Contact' },
  ];

  constructor() {
    const sub = inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.open.set(false));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}
