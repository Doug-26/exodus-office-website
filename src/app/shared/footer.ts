import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICES } from '../data/services.data';
import { ACTIVE_SOCIALS, SITE } from '../site.config';

@Component({
  selector: 'app-footer',
  imports: [NgOptimizedImage, RouterLink],
  template: `
    <footer class="ex-footer">
      <div class="container">
        <div class="row g-4 g-lg-5">
          <div class="col-lg-4">
            <a class="ex-brand ex-brand--light mb-3" routerLink="/">
              <img ngSrc="logo.svg" alt="" width="40" height="40" />
              <span>
                <span class="ex-brand__name">Exodus</span>
                <span class="ex-brand__sub">Home Office</span>
              </span>
            </a>
            <p class="mt-3 mb-4">{{ site.tagline }}</p>
            @if (socials.length) {
              <div class="d-flex gap-2">
                @for (s of socials; track s.label) {
                  <a class="ex-social" [href]="s.url" target="_blank" rel="noopener" [attr.aria-label]="s.label + ' (opens in new tab)'">
                    <i class="bi {{ s.icon }}" aria-hidden="true"></i>
                  </a>
                }
              </div>
            }
          </div>

          <div class="col-6 col-lg-2">
            <h2 class="h6">Company</h2>
            <ul>
              <li><a routerLink="/about">About us</a></li>
              <li><a routerLink="/portfolio">Portfolio</a></li>
              <li><a routerLink="/contact">Contact</a></li>
            </ul>
          </div>

          <div class="col-6 col-lg-3">
            <h2 class="h6">Services</h2>
            <ul>
              @for (s of services; track s.id) {
                <li>
                  <a routerLink="/services" [fragment]="s.id">{{ s.title }}</a>
                </li>
              }
            </ul>
          </div>

          <div class="col-lg-3">
            <h2 class="h6">Get in touch</h2>
            <ul>
              @if (site.email) {
                <li>
                  <i class="bi bi-envelope me-2" aria-hidden="true"></i
                  ><a [href]="'mailto:' + site.email">{{ site.email }}</a>
                </li>
              }
              @if (site.phone) {
                <li><i class="bi bi-telephone me-2" aria-hidden="true"></i>{{ site.phone }}</li>
              }
              <li><i class="bi bi-globe2 me-2" aria-hidden="true"></i>{{ site.location }}</li>
            </ul>
            <a routerLink="/contact" class="btn btn-warning btn-sm mt-2">Send us a message</a>
          </div>
        </div>

        <div class="ex-footer__bottom d-flex flex-column flex-md-row justify-content-between gap-2">
          <span>© {{ year }} {{ site.name }}. All rights reserved.</span>
          <span>Skilled People · Quality Work · Services You Can Trust</span>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly site = SITE;
  protected readonly socials = ACTIVE_SOCIALS;
  protected readonly services = SERVICES;
  protected readonly year = new Date().getFullYear();
}
