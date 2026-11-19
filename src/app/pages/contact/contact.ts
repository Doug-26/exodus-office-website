import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InquiriesService } from '../../data/inquiries.service';
import { SERVICES } from '../../data/services.data';
import { PageHeader } from '../../shared/page-header';
import { withMinDuration } from '../../shared/utils/min-duration';
import { ACTIVE_SOCIALS, SITE } from '../../site.config';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, PageHeader],
  templateUrl: './contact.html',
})
export class Contact implements OnInit {
  private readonly inquiries = inject(InquiriesService);

  /** Optional `?service=` query param to pre-select a service. */
  readonly service = input<string>();

  protected readonly site = SITE;
  protected readonly socials = ACTIVE_SOCIALS;
  protected readonly serviceOptions = [...SERVICES.map((s) => s.title), 'Not sure yet / multiple services'];

  protected readonly status = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');
  protected readonly errorMessage = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    service: [''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    /** Honeypot: hidden from people, bots tend to fill it in. */
    website: [''],
  });

  ngOnInit(): void {
    const match = SERVICES.find((s) => s.id === this.service());
    if (match) this.form.controls.service.setValue(match.title);
  }

  protected invalid(name: 'name' | 'email' | 'message'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { website, ...value } = this.form.getRawValue();
    if (website) {
      // Pretend success for bots.
      this.status.set('sent');
      return;
    }
    if (!this.inquiries.configured) {
      this.errorMessage.set('The contact form is not connected yet. Please reach us by email for now.');
      this.status.set('error');
      return;
    }

    this.status.set('sending');
    try {
      await withMinDuration(
        this.inquiries.submit({
          name: value.name.trim(),
          email: value.email.trim(),
          service: value.service || null,
          message: value.message.trim(),
        }),
      );
      this.form.reset();
      this.status.set('sent');
    } catch (e) {
      this.errorMessage.set((e as Error).message);
      this.status.set('error');
    }
  }
}
