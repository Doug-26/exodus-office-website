export type ProjectCategory = 'social_media' | 'video_editing' | 'graphic_design' | 'other';
export type MediaType = 'image' | 'video_file' | 'video_embed';
export type MediaAspect = '16:9' | '9:16' | '1:1' | '4:5';
export type InquiryStatus = 'new' | 'read' | 'archived';

export interface CategoryInfo {
  value: ProjectCategory;
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { value: 'social_media', label: 'Social Media', icon: 'bi-megaphone' },
  { value: 'video_editing', label: 'Video Editing', icon: 'bi-camera-reels' },
  { value: 'graphic_design', label: 'Graphic Design', icon: 'bi-palette' },
  { value: 'other', label: 'Other', icon: 'bi-stars' },
];

export function categoryInfo(value: ProjectCategory): CategoryInfo {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const ASPECTS: { value: MediaAspect; label: string }[] = [
  { value: '16:9', label: '16:9 Landscape (YouTube)' },
  { value: '9:16', label: '9:16 Vertical (Reels, TikTok, Shorts)' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:5', label: '4:5 Portrait (Feed post)' },
];

/** Maps an aspect to Bootstrap's `.ratio-*` class (9x16 and 4x5 are added in styles.scss). */
export function ratioClass(aspect: MediaAspect | null | undefined): string {
  return `ratio-${(aspect ?? '16:9').replace(':', 'x')}`;
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  type: MediaType;
  storage_path: string | null;
  embed_url: string | null;
  aspect: MediaAspect;
  caption: string | null;
  sort_order: number;
  created_at: string;
  /**
   * Small preview file (resized image or video poster frame), added by 0004_media_thumbs.sql.
   * Optional: null for older uploads and undefined until that migration runs.
   */
  thumb_path?: string | null;
}

/**
 * Storage path of a media item's small preview: its thumbnail / video poster, else the image
 * itself (uploads from before 0004). Null for videos without a poster and for embeds.
 */
export function previewPath(m: ProjectMedia): string | null {
  return m.thumb_path ?? (m.type === 'image' ? m.storage_path : null);
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  category: ProjectCategory;
  description: string | null;
  client_name: string | null;
  tools: string[];
  cover_path: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  project_media?: ProjectMedia[];
}

export type ProjectInput = Pick<
  Project,
  | 'title'
  | 'slug'
  | 'category'
  | 'description'
  | 'client_name'
  | 'tools'
  | 'cover_path'
  | 'is_featured'
  | 'is_published'
>;

export type NewMedia = Pick<ProjectMedia, 'project_id' | 'type' | 'aspect'> &
  Partial<Pick<ProjectMedia, 'storage_path' | 'embed_url' | 'caption' | 'sort_order' | 'thumb_path'>>;

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
  // Added by 0003_inquiry_context.sql. Optional because they're missing until that
  // migration runs; treat undefined like null/empty.
  /** Project the visitor was looking at ("Want something similar?"). Null once it's deleted. */
  project_id?: string | null;
  /** Title/slug saved by the database when the inquiry was sent (not editable by visitors). */
  project_title?: string | null;
  project_slug?: string | null;
  /** Picks from LIKED_OPTIONS. */
  liked?: string[];
  /** One of TIMELINE_OPTIONS. */
  timeline?: string | null;
}

export type InquiryInput = Pick<Inquiry, 'name' | 'email' | 'service' | 'message'> &
  Partial<Pick<Inquiry, 'liked' | 'timeline'>>;

/**
 * "What did you like about it?" picks, shown on the contact form when a project is attached.
 * Stored as these labels (max 8 picks), so they can be reworded without a migration.
 */
export const LIKED_OPTIONS: readonly string[] = [
  'Overall style and look',
  'Editing pace and transitions',
  'Animation and motion',
  'Colors and typography',
  'Music and sound',
  'Format and length',
  'Story and tone',
];

/** "When do you need it?" answers (max 40 characters each, stored as the label). */
export const TIMELINE_OPTIONS: readonly string[] = [
  'As soon as possible',
  'Within 2 weeks',
  'Within a month',
  'In 1–3 months',
  'Just exploring for now',
];
