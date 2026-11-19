import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MAX_UPLOAD_BYTES } from '../../core/supabase';
import { MediaService } from '../../data/media.service';
import { ASPECTS, MediaAspect, ProjectMedia } from '../../data/models';
import { detectAspect } from '../../shared/utils/media-aspect';
import { parseVideoUrl, VIDEO_PROVIDER_LABELS } from '../../shared/utils/video-url';

interface UploadItem {
  key: string;
  name: string;
  progress: number;
  error?: string;
}

interface LinkModel {
  url: string;
  aspect: MediaAspect;
}

const EMPTY_LINK: LinkModel = { url: '', aspect: '16:9' };

/** Lists, uploads, links, reorders and deletes the media of one project. */
@Component({
  selector: 'app-media-manager',
  imports: [FormField, FormRoot],
  templateUrl: './media-manager.html',
})
export class MediaManager implements OnInit {
  private readonly media = inject(MediaService);

  readonly projectId = input.required<string>();

  protected readonly aspects = ASPECTS;
  protected readonly maxMb = MAX_UPLOAD_BYTES / 1024 / 1024;

  protected readonly items = signal<ProjectMedia[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly tab = signal<'upload' | 'link'>('upload');
  protected readonly uploads = signal<UploadItem[]>([]);
  protected readonly dragOver = signal(false);

  private readonly linkModel = signal<LinkModel>({ ...EMPTY_LINK });
  protected readonly linkForm = form(
    this.linkModel,
    (link) => {
      validate(link.url, ({ value }) => {
        const url = value().trim();
        if (!url || parseVideoUrl(url)) return null;
        return {
          kind: 'videoUrl',
          message: /fb\.watch|facebook\.com\/share\//i.test(url)
            ? 'Facebook short/share links hide the video ID. Open the link, then copy the address from the browser bar (it contains /reel/ or /videos/ followed by numbers).'
            : 'Please paste a valid YouTube, Vimeo, or Facebook video/Reel link.',
        };
      });
    },
    { submission: { action: () => this.addLink() } },
  );
  /** Shown once the field has been left or submitted, so typing isn't interrupted. */
  protected readonly linkError = computed(() => {
    const url = this.linkForm.url();
    return url.touched() && url.invalid() ? (url.errors()[0]?.message ?? '') : '';
  });
  protected readonly canAddLink = computed(() => !this.busy() && !!this.linkForm.url().value().trim());

  async ngOnInit(): Promise<void> {
    try {
      this.items.set(await this.media.listForProject(this.projectId()));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  // ------------------------------------------------------------ Display helpers

  protected thumb(m: ProjectMedia): string | null {
    if (m.type === 'image' && m.storage_path) return this.media.publicUrl(m.storage_path);
    if (m.type === 'video_embed') return parseVideoUrl(m.embed_url)?.thumbnailUrl ?? null;
    return null;
  }

  protected fileUrl(m: ProjectMedia): string | null {
    return m.storage_path ? this.media.publicUrl(m.storage_path) : null;
  }

  protected typeLabel(m: ProjectMedia): string {
    if (m.type === 'image') return 'Image';
    if (m.type === 'video_file') return 'Uploaded video';
    const provider = parseVideoUrl(m.embed_url)?.provider;
    return provider ? `${VIDEO_PROVIDER_LABELS[provider]} video` : 'Video link';
  }

  protected embedIcon(m: ProjectMedia): string {
    const provider = m.type === 'video_embed' ? parseVideoUrl(m.embed_url)?.provider : null;
    return provider ? `bi-${provider}` : 'bi-play-btn';
  }

  // ------------------------------------------------------------ Upload files

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    void this.uploadFiles(files);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    void this.uploadFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  private async uploadFiles(files: File[]): Promise<void> {
    for (const file of files) {
      const key = crypto.randomUUID();
      const problem = this.media.validate(file);
      this.uploads.update((u) => [...u, { key, name: file.name, progress: 0, error: problem ?? undefined }]);
      if (problem) continue;

      const setItem = (patch: Partial<UploadItem>) =>
        this.uploads.update((u) => u.map((x) => (x.key === key ? { ...x, ...patch } : x)));

      let path: string | null = null;
      try {
        const aspect = await detectAspect(file);
        path = await this.media.upload(file, this.projectId(), (progress) => setItem({ progress }));
        const row = await this.media.add({
          project_id: this.projectId(),
          type: file.type.startsWith('video/') ? 'video_file' : 'image',
          storage_path: path,
          aspect,
          sort_order: this.items().length,
        });
        this.items.update((list) => [...list, row]);
        this.uploads.update((u) => u.filter((x) => x.key !== key));
      } catch (e) {
        if (path) void this.media.removeFiles([path]);
        setItem({ error: `${file.name}: ${(e as Error).message}` });
      }
    }
  }

  protected dismissUpload(key: string): void {
    this.uploads.update((u) => u.filter((x) => x.key !== key));
  }

  // ------------------------------------------------------------ Video links

  /** Reels/Shorts links switch the shape to vertical automatically. */
  protected onLinkInput(url: string): void {
    if (parseVideoUrl(url)?.isVertical) this.linkForm.aspect().value.set('9:16');
  }

  /** Submission action of `linkForm`; only runs when the link is valid. */
  private async addLink(): Promise<undefined> {
    const { url, aspect } = this.linkModel();
    if (!url.trim() || this.busy()) return;
    await this.run(async () => {
      const row = await this.media.add({
        project_id: this.projectId(),
        type: 'video_embed',
        embed_url: url.trim(),
        aspect,
        sort_order: this.items().length,
      });
      this.items.update((list) => [...list, row]);
      this.linkForm().reset({ ...EMPTY_LINK });
    });
  }

  // ------------------------------------------------------------ Edit existing

  protected async setAspect(m: ProjectMedia, value: string): Promise<void> {
    const aspect = ASPECTS.find((a) => a.value === value)?.value;
    if (!aspect || aspect === m.aspect) return;
    await this.run(async () => {
      await this.media.update(m.id, { aspect });
      this.patchItem(m.id, { aspect });
    });
  }

  protected async setCaption(m: ProjectMedia, caption: string): Promise<void> {
    const value = caption.trim() || null;
    if (value === m.caption) return;
    await this.run(async () => {
      await this.media.update(m.id, { caption: value });
      this.patchItem(m.id, { caption: value });
    });
  }

  protected async move(index: number, delta: number): Promise<void> {
    const list = [...this.items()];
    const target = index + delta;
    [list[index], list[target]] = [list[target], list[index]];
    this.items.set(list);
    await this.run(() => this.media.saveOrder(list.map((m) => m.id)));
  }

  protected async remove(m: ProjectMedia): Promise<void> {
    if (!confirm('Remove this item from the project?')) return;
    await this.run(async () => {
      await this.media.remove(m);
      this.items.update((list) => list.filter((x) => x.id !== m.id));
    });
  }

  private patchItem(id: string, patch: Partial<ProjectMedia>): void {
    this.items.update((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
