import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InquiriesService } from '../../data/inquiries.service';
import { LIKED_OPTIONS, Project, TIMELINE_OPTIONS } from '../../data/models';
import { ProjectsService } from '../../data/projects.service';
import { SERVICES } from '../../data/services.data';
import { PageHeader } from '../../shared/page-header';
import { isProjectSlug } from '../../shared/utils/inquiry-project';
import { withMinDuration } from '../../shared/utils/min-duration';
import { ACTIVE_SOCIALS, SITE } from '../../site.config';
import { LikedPicks } from './liked-picks';
import { ProjectReference } from './project-reference';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, PageHeader, ProjectReference, LikedPicks],
  templateUrl: './contact.html',
})
export class Contact implements OnInit {
  private readonly inquiries = inject(InquiriesService);
  private readonly projects = inject(ProjectsService);

  /** Optional `?service=` query param to pre-select a service. */
  readonly service = input<string>();
  /** Optional `?project=<slug>` from a project page's "Start a project" button. */
  readonly projectSlug = input<string | undefined>(undefined, { alias: 'project' });

  protected readonly site = SITE;
  protected readonly socials = ACTIVE_SOCIALS;
  protected readonly serviceOptions = [
    ...SERVICES.map((s) => s.title),
    'Not sure yet / multiple services',
  ];
  protected readonly likedOptions = LIKED_OPTIONS;
  protected readonly timelineOptions = TIMELINE_OPTIONS;

  protected readonly status = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');
  protected readonly errorMessage = signal('');

  /** The project this inquiry is about (published projects only). */
  protected readonly attached = signal<Project | null>(null);
  protected readonly resolving = signal(false);
  protected readonly liked = signal<string[]>([]);
  /** Read out by screen readers (e.g. after removing the project). */
  protected readonly announcement = signal('');
  /** Title of the project the last sent message was about, for the thank-you text. */
  protected readonly sentAbout = signal<string | null>(null);

  private readonly formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');
  private attachRun = 0;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    service: [''],
    timeline: [''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    /** Honeypot: hidden from people, bots tend to fill it in. */
    website: [''],
  });

  constructor() {
    effect(() => {
      const slug = this.projectSlug();
      untracked(() => void this.attach(slug));
    });
  }

  ngOnInit(): void {
    const match = SERVICES.find((s) => s.id === this.service());
    if (match) this.form.controls.service.setValue(match.title);
  }

  protected invalid(name: 'name' | 'email' | 'message'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  /** Looks up `?project=`. Anything unusable just leaves the normal form. */
  private async attach(slug: string | undefined): Promise<void> {
    const run = ++this.attachRun;
    this.attached.set(null);
    this.liked.set([]);
    if (!isProjectSlug(slug) || !this.projects.configured) {
      this.resolving.set(false);
      return;
    }
    this.resolving.set(true);
    try {
      const project = await this.projects.getBySlug(slug);
      if (run === this.attachRun) this.attached.set(project);
    } catch {
      // Ignore: the visitor can still send a normal message.
    } finally {
      if (run === this.attachRun) this.resolving.set(false);
    }
  }

  protected removeProject(): void {
    const title = this.attached()?.title ?? 'The project';
    this.attached.set(null);
    this.liked.set([]);
    this.announcement.set(`${title} was removed from your message.`);
    this.formHeading()?.nativeElement.focus();
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
      this.errorMessage.set(
        'The contact form is not connected yet. Please reach us by email for now.',
      );
      this.status.set('error');
      return;
    }

    const project = this.attached();
    this.status.set('sending');
    try {
      await withMinDuration(
        this.inquiries.submit(
          {
            name: value.name.trim(),
            email: value.email.trim(),
            service: value.service || null,
            message: value.message.trim(),
            liked: project ? this.liked() : [],
            timeline: value.timeline || null,
          },
          project,
        ),
      );
      this.form.reset();
      this.sentAbout.set(project?.title ?? null);
      this.attached.set(null);
      this.liked.set([]);
      this.announcement.set('');
      this.status.set('sent');
    } catch (e) {
      this.errorMessage.set((e as Error).message);
      this.status.set('error');
    }
  }
}
