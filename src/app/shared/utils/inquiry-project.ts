import type { Inquiry, Project, ProjectCategory } from '../../data/models';
import type { ServiceInfo } from '../../data/services.data';
import { SLUG_PATTERN } from './slug';

/**
 * Helpers for inquiries that reference a portfolio project
 * ("Want something similar?" → contact form → email / admin).
 */

/** True for values that could be a project slug, so junk never reaches the API. */
export function isProjectSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && SLUG_PATTERN.test(value);
}

/** Project categories that clearly match one of the services on the contact form. */
const CATEGORY_SERVICE: Partial<Record<ProjectCategory, ServiceInfo['id']>> = {
  social_media: 'social-media',
  video_editing: 'video-editing',
};

/** Query params for the "Start a project" link on a project page. */
export function projectContactParams(p: Pick<Project, 'slug' | 'category'>): {
  project: string;
  service?: ServiceInfo['id'];
} {
  const service = CATEGORY_SERVICE[p.category];
  return service ? { project: p.slug, service } : { project: p.slug };
}

export interface InquiryContext {
  project?: Pick<Project, 'title' | 'slug'> | null;
  liked?: readonly string[];
  timeline?: string | null;
}

/**
 * Fallback for a database that doesn't have the project/liked/timeline columns yet:
 * appends those details to the message so staff still see them. The visitor's text is
 * shortened if needed so the result fits the database limit.
 */
export function messageWithContext(
  message: string,
  ctx: InquiryContext,
  siteUrl: string,
  max = 5000,
): string {
  const lines: string[] = [];
  if (ctx.project) {
    lines.push(
      `Wants something like: ${ctx.project.title} (${siteUrl}/portfolio/${ctx.project.slug})`,
    );
  }
  if (ctx.liked?.length) lines.push(`Liked: ${ctx.liked.join(', ')}`);
  if (ctx.timeline) lines.push(`Timeline: ${ctx.timeline}`);
  if (!lines.length) return message;

  const footer = `\n\n---\n${lines.join('\n')}`;
  const room = max - footer.length;
  const body = message.length > room ? `${message.slice(0, Math.max(0, room - 1))}…` : message;
  return body + footer;
}

/**
 * Errors that mean "the database doesn't accept these columns (yet)". All of them are
 * raised before a row is written, so retrying without the columns can't save twice.
 *   PGRST204  unknown column in the request (migration not run, or schema cache stale)
 *   42703     undefined column
 *   42501     no insert privilege on a column
 */
export function isMissingColumnError(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && ['PGRST204', '42703', '42501'].includes(error.code);
}

/** What the admin knows about the project an inquiry referenced. */
export interface ProjectRef {
  /**
   * live: still published · unpublished: hidden since · deleted: only the snapshot is left ·
   * unresolved: the project couldn't be loaded, so only the snapshot is shown.
   */
  state: 'live' | 'unpublished' | 'deleted' | 'unresolved';
  /** Best title to show: the current one if known, else the one saved with the inquiry. */
  title: string;
  /** The current project row, when it could be loaded. */
  project: Project | null;
  /** Slug for a "View on site" link (published projects only). */
  viewSlug: string | null;
  /** Id for an "Edit project" link (when the project still exists). */
  editId: string | null;
  /** The title saved with the inquiry, only when it differs from the current one. */
  sentTitle: string | null;
}

export function projectRef(
  q: Pick<Inquiry, 'project_id' | 'project_title'>,
  byId: ReadonlyMap<string, Project>,
): ProjectRef | null {
  const snapshot = q.project_title || null;
  if (q.project_id) {
    const p = byId.get(q.project_id);
    if (!p) {
      return {
        state: 'unresolved',
        title: snapshot ?? 'Portfolio project',
        project: null,
        viewSlug: null,
        editId: q.project_id,
        sentTitle: null,
      };
    }
    return {
      state: p.is_published ? 'live' : 'unpublished',
      title: p.title,
      project: p,
      viewSlug: p.is_published ? p.slug : null,
      editId: p.id,
      sentTitle: snapshot && snapshot !== p.title ? snapshot : null,
    };
  }
  if (snapshot) {
    return {
      state: 'deleted',
      title: snapshot,
      project: null,
      viewSlug: null,
      editId: null,
      sentTitle: null,
    };
  }
  return null;
}

/** Subject for the admin's "Reply by email" link. */
export function replySubject(
  q: Pick<Inquiry, 'service' | 'project_title'>,
  siteName: string,
): string {
  const base = `Re: Your inquiry to ${siteName}`;
  if (q.project_title) return `${base} about "${q.project_title}"`;
  return q.service ? `${base} (${q.service})` : base;
}

/** Number of inquiries per project id (rows without a project are ignored). */
export function countByProject(
  rows: readonly { project_id?: string | null }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { project_id: id } of rows) {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
