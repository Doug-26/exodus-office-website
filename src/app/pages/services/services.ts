import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICES } from '../../data/services.data';
import { CtaBand } from '../../shared/cta-band';
import { PageHeader } from '../../shared/page-header';
import { SectionHeading } from '../../shared/section-heading';

@Component({
  selector: 'app-services',
  imports: [RouterLink, PageHeader, SectionHeading, CtaBand],
  template: `
    <app-page-header
      eyebrow="Our services"
      heading="Support for the work that keeps your business moving"
      subtitle="Social media, video, and bookkeeping, each handled by trained professionals who meet your deadlines."
    />

    @for (s of services; track s.id; let odd = $odd) {
      <section class="ex-section" [class.ex-bg-sand]="odd" [id]="s.id" style="scroll-margin-top: 5rem">
        <div class="container">
          <div class="row g-4 g-lg-5 align-items-center">
            <div class="col-lg-6" [class.order-lg-2]="odd">
              <span class="ex-icon-badge ex-icon-badge--lg mb-4"><i class="bi {{ s.icon }}" aria-hidden="true"></i></span>
              <h2 class="display-6 mb-3">{{ s.title }}</h2>
              <p class="ex-lead">{{ s.summary }}</p>
              @if (s.id === 'bookkeeping') {
                <p class="small text-body-secondary">
                  <i class="bi bi-shield-lock me-1" aria-hidden="true"></i>
                  To protect our clients' privacy, we don't publish bookkeeping work in our portfolio.
                </p>
              }
              <a class="btn btn-primary mt-2" routerLink="/contact" [queryParams]="{ service: s.id }">
                Ask about {{ s.title.toLowerCase() }}
              </a>
            </div>
            <div class="col-lg-6">
              <div class="ex-card">
                <h3 class="h6 text-uppercase text-body-secondary mb-4" style="letter-spacing: 0.1em">What's included</h3>
                <ul class="ex-checklist fs-5 mb-0">
                  @for (d of s.deliverables; track d) {
                    <li>{{ d }}</li>
                  }
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    }

    <section class="ex-section">
      <div class="container">
        <app-section-heading
          center
          eyebrow="How we work"
          heading="Simple, clear, and on time"
          subtitle="Every project follows the same dependable process, whatever the service."
        />
        <div class="row g-4 mt-4">
          @for (step of steps; track step.title; let i = $index) {
            <div class="col-sm-6 col-lg-3">
              <div class="ex-step">
                <span class="ex-step__num">{{ i + 1 }}</span>
                <h3 class="h5">{{ step.title }}</h3>
                <p class="text-body-secondary mb-0">{{ step.text }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <app-cta-band heading="Not sure which service you need?" text="Tell us about your business and we'll recommend the right support." />
  `,
})
export class Services {
  protected readonly services = SERVICES;
  protected readonly steps = [
    { title: 'Understand', text: 'We learn about your business, goals, and expectations.' },
    { title: 'Agree', text: 'We confirm the scope, timeline, and deadlines with you upfront.' },
    { title: 'Deliver', text: 'Our trained team does the work with close attention to detail.' },
    { title: 'Review', text: 'We keep you updated and refine the work until it meets your needs.' },
  ];
}
