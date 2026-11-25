import { inject, Service } from '@angular/core';
import { MAX_UPLOAD_BYTES, MEDIA_BUCKET, Supabase } from '../core/supabase';
import { isMissingColumnError } from '../shared/utils/inquiry-project';
import { changedOrder, Ordered } from '../shared/utils/sort-order';
import { NewMedia, previewPath, ProjectMedia } from './models';
import { friendlyError } from './projects.service';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/** File extension for a storage path: the file's own name, else its (re-encoded) type. */
function extensionOf(file: Blob): string {
  const fromName =
    file instanceof File
      ? (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      : '';
  return fromName || MIME_EXTENSIONS[file.type] || 'bin';
}

/** Uploads files to Supabase Storage and manages `project_media` rows (admin only). */
@Service()
export class MediaService {
  private readonly sb = inject(Supabase);

  /** Returns an error message if the file can't be uploaded, otherwise null. */
  validate(file: File, allow: 'image' | 'image-or-video' = 'image-or-video'): string | null {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (file.type === 'image/svg+xml') {
      return `${file.name}: SVG files aren't supported. Please use a JPG, PNG, or WebP image.`;
    }
    if (allow === 'image' && !isImage) return `${file.name}: please choose an image file.`;
    if (!isImage && !isVideo) return `${file.name}: only images and videos are supported.`;
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return `${file.name} is ${mb} MB. The limit is 50 MB, so post it on YouTube, Vimeo, or Facebook and add it as a video link instead.`;
    }
    return null;
  }

  /**
   * Uploads a file (or a resized blob from `prepareUpload()`) into `folder/` and returns its
   * storage path. Uses XHR (instead of supabase-js) so we can report upload progress.
   */
  async upload(
    file: Blob,
    folder: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    const { data } = await this.sb.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your session has expired. Please sign in again.');

    const path = `${folder}/${crypto.randomUUID()}.${extensionOf(file)}`;

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
      xhr.onerror = () =>
        reject(new Error('Network error during upload. Check your connection and try again.'));
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

  /**
   * Adds a media row. `thumb_path` is only sent when set; if the database doesn't have that
   * column yet (0004 not applied), the row is saved without it and the thumb file is removed.
   */
  async add(media: NewMedia): Promise<ProjectMedia> {
    const { thumb_path, ...base } = media;
    const insert = (row: NewMedia) =>
      this.sb.client.from('project_media').insert(row).select().single();

    let { data, error } = await insert(thumb_path ? media : base);
    if (error && thumb_path && isMissingColumnError(error)) {
      void this.removeFiles([thumb_path]);
      ({ data, error } = await insert(base));
    }
    if (error) throw friendlyError(error);
    return data as ProjectMedia;
  }

  async update(
    id: string,
    patch: Partial<Pick<ProjectMedia, 'aspect' | 'caption'>>,
  ): Promise<void> {
    const { error } = await this.sb.client.from('project_media').update(patch).eq('id', id);
    if (error) throw friendlyError(error);
  }

  async remove(media: ProjectMedia): Promise<void> {
    const { error } = await this.sb.client.from('project_media').delete().eq('id', media.id);
    if (error) throw friendlyError(error);
    await this.removeFiles([media.storage_path, media.thumb_path]);
  }

  /** Saves `items`' positions as sort_order, writing only the rows that changed. */
  async saveOrder(items: readonly Ordered[]): Promise<void> {
    const results = await Promise.all(
      changedOrder(items).map(({ id, sort_order }) =>
        this.sb.client.from('project_media').update({ sort_order }).eq('id', id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw friendlyError(failed.error);
  }

  publicUrl(path: string): string {
    return this.sb.publicUrl(path);
  }

  /** Small preview for lists: the thumbnail/poster when there is one, else the file itself. */
  thumbUrl(m: ProjectMedia): string | null {
    const path = previewPath(m);
    return path ? this.sb.publicUrl(path) : null;
  }
}
