import { Component } from '@angular/core';
import { SERVICES, VALUES } from '../../data/services.data';
import { CtaBand } from '../../shared/cta-band';
import { PageHeader } from '../../shared/page-header';
import { SectionHeading } from '../../shared/section-heading';

@Component({
  selector: 'app-about',
  imports: [PageHeader, SectionHeading, CtaBand],
  template: `
    <app-page-header
      eyebrow="About us"
      heading="A team of dedicated, trained professionals"
      subtitle="Reliable, high-quality virtual services across different industries and niches."
    />

    <section class="ex-section">
      <div class="container">
        <div class="row g-4 g-lg-5 align-items-center">
          <div class="col-lg-6">
            <app-section-heading eyebrow="Who we are" heading="Skilled people who help businesses grow" />
            <p class="ex-lead mt-3">
              Exodus Home Office is a team of Social Media Managers, Video Editors, and Bookkeepers. Each of us brings
              our own knowledge, creativity, and expertise to help businesses grow and succeed.
            </p>
            <p class="text-body-secondary">
              We've completed training in our respective fields and keep developing our skills, so the work we deliver
              meets our clients' needs and expectations.
            </p>
          </div>
          <div class="col-lg-6">
            <div class="ex-card">
              <h3 class="h5 mb-4">Our team</h3>
              <div class="d-grid gap-4">
                @for (s of services; track s.id) {
                  <div class="d-flex gap-3">
                    <span class="ex-icon-badge"><i class="bi {{ s.icon }}" aria-hidden="true"></i></span>
                    <div>
                      <strong class="d-block">{{ roleFor(s.id) }}</strong>
                      <span class="text-body-secondary">{{ s.tagline }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="ex-section ex-bg-sand">
      <div class="container">
        <div class="row g-4 g-lg-5 align-items-center">
          <div class="col-lg-6 order-lg-2">
            <app-section-heading eyebrow="Our mission" heading="So you can focus on what matters most" />
            <p class="ex-lead mt-3 mb-0">
              We provide excellent, dependable, professional services, so business owners can focus on what matters
              most while we take care of the rest.
            </p>
          </div>
          <div class="col-lg-6 order-lg-1">
            <figure class="ex-quote mb-0">
              <i class="bi bi-quote fs-1 opacity-50" aria-hidden="true"></i>
              <blockquote class="mb-3">
                <p class="mb-0">Skilled People, Quality Work, and Services You Can Trust.</p>
              </blockquote>
              <figcaption class="opacity-75">Exodus Home Office</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>

    <section class="ex-section">
      <div class="container">
        <app-section-heading
          center
          eyebrow="Our values"
          heading="How we work with every client"
          subtitle="We value our clients' time and trust. That's why we prioritize clear communication, attention to detail, and finishing every project within the agreed deadline."
        />
        <div class="row g-4 mt-4">
          @for (v of values; track v.title) {
            <div class="col-sm-6 col-lg-3">
              <div class="ex-card text-center">
                <span class="ex-icon-badge ex-icon-badge--lg mb-3"><i class="bi {{ v.icon }}" aria-hidden="true"></i></span>
                <h3 class="h5">{{ v.title }}</h3>
                <p class="text-body-secondary mb-0">{{ v.text }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <app-cta-band heading="Let's build a successful partnership." />
  `,
})
export class About {
  protected readonly services = SERVICES;
  protected readonly values = VALUES;

  private readonly roles: Record<string, string> = {
    'social-media': 'Social Media Managers',
    'video-editing': 'Video Editors',
    bookkeeping: 'Bookkeepers',
  };

  protected roleFor(id: string): string {
    return this.roles[id] ?? id;
  }
}
