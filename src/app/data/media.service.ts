import { inject, Injectable } from '@angular/core';
import { MAX_UPLOAD_BYTES, MEDIA_BUCKET, Supabase } from '../core/supabase';
import { NewMedia, ProjectMedia } from './models';
import { friendlyError } from './projects.service';

/** Uploads files to Supabase Storage and manages `project_media` rows (admin only). */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly sb = inject(Supabase);

  /** Returns an error message if the file can't be uploaded, otherwise null. */
  validate(file: File, allow: 'image' | 'image-or-video' = 'image-or-video'): string | null {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (allow === 'image' && !isImage) return `${file.name}: please choose an image file.`;
    if (!isImage && !isVideo) return `${file.name}: only images and videos are supported.`;
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return `${file.name} is ${mb} MB. The limit is 50 MB, so post it on YouTube, Vimeo, or Facebook and add it as a video link instead.`;
    }
    return null;
  }

  /**
   * Uploads a file into `folder/` and returns its storage path.
   * Uses XHR (instead of supabase-js) so we can report upload progress.
   */
  async upload(file: File, folder: string, onProgress?: (percent: number) => void): Promise<string> {
    const { data } = await this.sb.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your session has expired. Please sign in again.');

    const ext = (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.sb.url}/storage/v1/object/${MEDIA_BUCKET}/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', this.sb.anonKey);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('cache-control', 'max-age=31536000');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let message = `Upload failed (${xhr.status}).`;
        try {
          message = JSON.parse(xhr.responseText).message ?? message;
        } catch {
          /* keep default message */
        }
        reject(new Error(message));
      };
      xhr.onerror = () => reject(new Error('Network error during upload. Check your connection and try again.'));
      xhr.send(file);
    });

    return path;
  }

  async removeFiles(paths: (string | null | undefined)[]): Promise<void> {
    const clean = paths.filter((p): p is string => !!p);
    if (clean.length) await this.sb.client.storage.from(MEDIA_BUCKET).remove(clean);
  }

  async listForProject(projectId: string): Promise<ProjectMedia[]> {
    const { data, error } = await this.sb.client
      .from('project_media')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('created_at');
    if (error) throw friendlyError(error);
    return data as ProjectMedia[];
  }

  async add(media: NewMedia): Promise<ProjectMedia> {
    const { data, error } = await this.sb.client.from('project_media').insert(media).select().single();
    if (error) throw friendlyError(error);
    return data as ProjectMedia;
  }

  async update(id: string, patch: Partial<Pick<ProjectMedia, 'aspect' | 'caption'>>): Promise<void> {
    const { error } = await this.sb.client.from('project_media').update(patch).eq('id', id);
    if (error) throw friendlyError(error);
  }

  async remove(media: ProjectMedia): Promise<void> {
    const { error } = await this.sb.client.from('project_media').delete().eq('id', media.id);
    if (error) throw friendlyError(error);
    await this.removeFiles([media.storage_path]);
  }

  async saveOrder(ids: string[]): Promise<void> {
    const results = await Promise.all(
      ids.map((id, i) => this.sb.client.from('project_media').update({ sort_order: i }).eq('id', id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw friendlyError(failed.error);
  }

  publicUrl(path: string): string {
    return this.sb.publicUrl(path);
  }
}
