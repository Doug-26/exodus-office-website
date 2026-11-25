import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo';
import { Supabase } from '../../core/supabase';
import { categoryInfo, Project, ProjectMedia, ratioClass } from '../../data/models';
import { ProjectsService } from '../../data/projects.service';
import { LazyVideo } from '../../shared/lazy-video';
import { Lightbox, LightboxImage } from '../../shared/lightbox';
import { projectContactParams } from '../../shared/utils/inquiry-project';
import { VideoEmbed } from '../../shared/video-embed';

interface GalleryImage extends LightboxImage {
  thumb: string;
}

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, VideoEmbed, Lightbox, LazyVideo],
  templateUrl: './project-detail.html',
})
export class ProjectDetail {
  private readonly projects = inject(ProjectsService);
  private readonly seo = inject(SeoService);
  private readonly sb = inject(Supabase);

  /** Bound from the `:slug` route param. */
  readonly slug = input.required<string>();

  protected readonly project = signal<Project | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly category = computed(() => {
    const p = this.project();
    return p ? categoryInfo(p.category) : null;
  });
  /** "Start a project" carries this project (and a matching service) to the contact form. */
  protected readonly contactParams = computed(() => {
    const p = this.project();
    return p ? projectContactParams(p) : null;
  });
  protected readonly videos = computed(() => (this.project()?.project_media ?? []).filter((m) => m.type !== 'image'));
  /** Gallery tiles load the small `thumb`; the lightbox loads the full `src`. */
  protected readonly images = computed<GalleryImage[]>(() => {
    const p = this.project();
    return (p?.project_media ?? [])
      .filter((m) => m.type === 'image')
      .map((m, i) => ({
        src: this.projects.mediaUrl(m) ?? '',
        thumb: this.projects.thumbUrl(m) ?? '',
        alt: m.caption || `${p?.title} image ${i + 1}`,
      }));
  });

  protected readonly ratioClass = ratioClass;

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.load(slug));
    });
  }

  protected fileUrl(path: string): string {
    return this.sb.publicUrl(path);
  }

  /** Poster frame captured at upload (null for older uploads). */
  protected posterUrl(m: ProjectMedia): string | null {
    return m.thumb_path ? this.sb.publicUrl(m.thumb_path) : null;
  }

  private async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const p = await this.projects.getBySlug(slug);
      this.project.set(p);
      if (p) {
        this.seo.set({
          title: p.title,
          description: p.description?.slice(0, 160) || `${categoryInfo(p.category).label} project by Exodus Home Office.`,
          image: this.projects.coverUrl(p),
        });
      } else {
        this.seo.set({ title: 'Project not found', noindex: true });
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
