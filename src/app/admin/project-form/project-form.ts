import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES, ProjectCategory, ProjectInput } from '../../data/models';
import { MediaService } from '../../data/media.service';
import { ProjectsService } from '../../data/projects.service';
import { prepareCover } from '../../shared/utils/image-resize';
import { withMinDuration } from '../../shared/utils/min-duration';
import { SLUG_PATTERN, slugify } from '../../shared/utils/slug';
import { MediaManager } from '../media-manager/media-manager';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink, MediaManager],
  templateUrl: './project-form.html',
})
export class ProjectForm implements OnInit {
  private readonly projects = inject(ProjectsService);
  private readonly media = inject(MediaService);
  private readonly router = inject(Router);

  /** Route param; undefined on /admin/projects/new. */
  readonly id = input<string>();

  protected readonly categories = CATEGORIES;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal(false);
  protected readonly notFound = signal(false);

  protected readonly coverPath = signal<string | null>(null);
  protected readonly coverProgress = signal<number | null>(null);
  /** Cover stored in the DB; replaced files are deleted after a successful save. */
  private savedCover: string | null = null;
  private slugEdited = false;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(SLUG_PATTERN)]],
    category: ['social_media' as ProjectCategory, Validators.required],
    client_name: [''],
    tools: [''],
    description: [''],
    is_featured: [false],
    is_published: [false],
  });

  constructor() {
    this.form.controls.title.valueChanges.subscribe((title) => {
      if (!this.slugEdited) this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    try {
      const p = await this.projects.getById(id);
      if (!p) {
        this.notFound.set(true);
        return;
      }
      this.slugEdited = true;
      this.savedCover = p.cover_path;
      this.coverPath.set(p.cover_path);
      this.form.setValue({
        title: p.title,
        slug: p.slug,
        category: p.category,
        client_name: p.client_name ?? '',
        tools: p.tools.join(', '),
        description: p.description ?? '',
        is_featured: p.is_featured,
        is_published: p.is_published,
      });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected onSlugInput(): void {
    this.slugEdited = true;
  }

  protected tidySlug(): void {
    const c = this.form.controls.slug;
    c.setValue(slugify(c.value));
  }

  protected invalid(name: 'title' | 'slug'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected coverUrl(path: string): string {
    return this.media.publicUrl(path);
  }

  protected async onCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const problem = this.media.validate(file, 'image');
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.error.set('');
    this.coverProgress.set(0);
    try {
      const previous = this.coverPath();
      // Capped at 1600 px: plenty for cards and share previews, a fraction of a phone photo.
      const cover = await prepareCover(file);
      const path = await this.media.upload(cover, 'covers', (p) => this.coverProgress.set(p));
      this.coverPath.set(path);
      // Drop an unsaved earlier upload right away; the saved one goes after save().
      if (previous && previous !== this.savedCover) void this.media.removeFiles([previous]);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.coverProgress.set(null);
    }
  }

  protected removeCover(): void {
    const current = this.coverPath();
    if (current && current !== this.savedCover) void this.media.removeFiles([current]);
    this.coverPath.set(null);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please fix the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const payload: ProjectInput = {
      title: v.title.trim(),
      slug: v.slug,
      category: v.category,
      client_name: v.client_name.trim() || null,
      description: v.description.trim() || null,
      tools: v.tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      cover_path: this.coverPath(),
      is_featured: v.is_featured,
      is_published: v.is_published,
    };

    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      const id = this.id();
      if (id) {
        await withMinDuration(this.projects.update(id, payload));
        if (this.savedCover && this.savedCover !== payload.cover_path) void this.media.removeFiles([this.savedCover]);
        this.savedCover = payload.cover_path;
        this.saved.set(true);
        this.form.markAsPristine();
      } else {
        const created = await withMinDuration(this.projects.create(payload));
        // Continue on the edit page so media can be attached to the new project.
        await this.router.navigate(['/admin/projects', created.id], { replaceUrl: true, state: { created: true } });
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  protected justCreated(): boolean {
    return Boolean(history.state?.created);
  }
}
