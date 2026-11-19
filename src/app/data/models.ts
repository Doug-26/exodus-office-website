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
  Partial<Pick<ProjectMedia, 'storage_path' | 'embed_url' | 'caption' | 'sort_order'>>;

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

export type InquiryInput = Pick<Inquiry, 'name' | 'email' | 'service' | 'message'>;
