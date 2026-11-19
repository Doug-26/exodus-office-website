import { inject, Injectable } from '@angular/core';
import type { PostgrestError } from '@supabase/supabase-js';
import { MEDIA_BUCKET, Supabase } from '../core/supabase';
import { parseVideoUrl } from '../shared/utils/video-url';
import { Project, ProjectInput, ProjectMedia } from './models';

const PROJECT_WITH_MEDIA = '*, project_media(*)';

/** Turns Postgres errors into messages a non-technical admin can act on. */
export function friendlyError(error: PostgrestError | Error): Error {
  if ('code' in error && error.code === '23505') {
    return new Error('That URL slug is already used by another project. Please choose a different one.');
  }
  return new Error(error.message || 'Something went wrong. Please try again.');
}

function sortMedia(p: Project): Project {
  p.project_media?.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  return p;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly sb = inject(Supabase);

  get configured(): boolean {
    return this.sb.configured;
  }

  // ------------------------------------------------------------- Public

  /** Published projects (RLS hides unpublished ones from visitors anyway). */
  async listPublished(): Promise<Project[]> {
    if (!this.sb.configured) return [];
    const { data, error } = await this.sb.client
      .from('projects')
      .select(PROJECT_WITH_MEDIA)
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return (data as Project[]).map(sortMedia);
  }

  async listFeatured(limit = 6): Promise<Project[]> {
    if (!this.sb.configured) return [];
    const { data, error } = await this.sb.client
      .from('projects')
      .select(PROJECT_WITH_MEDIA)
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw friendlyError(error);
    return (data as Project[]).map(sortMedia);
  }

  async getBySlug(slug: string): Promise<Project | null> {
    if (!this.sb.configured) return null;
    const { data, error } = await this.sb.client
      .from('projects')
      .select(PROJECT_WITH_MEDIA)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw friendlyError(error);
    return data ? sortMedia(data as Project) : null;
  }

  // ------------------------------------------------------------- Admin

  async listAll(): Promise<Project[]> {
    const { data, error } = await this.sb.client
      .from('projects')
      .select(PROJECT_WITH_MEDIA)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return (data as Project[]).map(sortMedia);
  }

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await this.sb.client.from('projects').select(PROJECT_WITH_MEDIA).eq('id', id).maybeSingle();
    if (error) throw friendlyError(error);
    return data ? sortMedia(data as Project) : null;
  }

  async create(input: ProjectInput): Promise<Project> {
    const { data, error } = await this.sb.client.from('projects').insert(input).select().single();
    if (error) throw friendlyError(error);
    return data as Project;
  }

  async update(id: string, patch: Partial<ProjectInput>): Promise<Project> {
    const { data, error } = await this.sb.client.from('projects').update(patch).eq('id', id).select().single();
    if (error) throw friendlyError(error);
    return data as Project;
  }

  /** Deletes the project, its media rows (cascade) and its files in storage. */
  async remove(project: Project): Promise<void> {
    const paths = [
      project.cover_path,
      ...(project.project_media ?? []).map((m) => m.storage_path),
    ].filter((p): p is string => !!p);

    const { error } = await this.sb.client.from('projects').delete().eq('id', project.id);
    if (error) throw friendlyError(error);
    if (paths.length) await this.sb.client.storage.from(MEDIA_BUCKET).remove(paths);
  }

  /** Persists a new display order: position in `ids` becomes sort_order. */
  async saveOrder(ids: string[]): Promise<void> {
    const results = await Promise.all(
      ids.map((id, i) => this.sb.client.from('projects').update({ sort_order: i }).eq('id', id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw friendlyError(failed.error);
  }

  // ------------------------------------------------------------- Display helpers

  /** Cover image: explicit cover → first image → YouTube thumbnail → null. */
  coverUrl(p: Project): string | null {
    if (p.cover_path) return this.sb.publicUrl(p.cover_path);
    const media = p.project_media ?? [];
    const image = media.find((m) => m.type === 'image' && m.storage_path);
    if (image?.storage_path) return this.sb.publicUrl(image.storage_path);
    for (const m of media) {
      const thumb = m.type === 'video_embed' ? parseVideoUrl(m.embed_url)?.thumbnailUrl : null;
      if (thumb) return thumb;
    }
    return null;
  }

  /**
   * Fallback when there's no cover image: the first uploaded video file, so the
   * card can show its opening frame. `#t=0.1` makes browsers (incl. iOS Safari)
   * render a real frame instead of a black one.
   */
  previewVideoUrl(p: Project): string | null {
    if (this.coverUrl(p)) return null;
    const video = (p.project_media ?? []).find((m) => m.type === 'video_file' && m.storage_path);
    return video?.storage_path ? `${this.sb.publicUrl(video.storage_path)}#t=0.1` : null;
  }

  hasVideo(p: Project): boolean {
    return (p.project_media ?? []).some((m) => m.type !== 'image');
  }

  mediaUrl(m: ProjectMedia): string | null {
    return m.storage_path ? this.sb.publicUrl(m.storage_path) : null;
  }
}
