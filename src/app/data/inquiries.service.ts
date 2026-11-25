import { inject, Service } from '@angular/core';
import { Supabase } from '../core/supabase';
import {
  countByProject,
  isMissingColumnError,
  messageWithContext,
} from '../shared/utils/inquiry-project';
import { SITE } from '../site.config';
import { Inquiry, InquiryInput, InquiryStatus, Project } from './models';
import { friendlyError } from './projects.service';

@Service()
export class InquiriesService {
  private readonly sb = inject(Supabase);

  get configured(): boolean {
    return this.sb.configured;
  }

  /**
   * Public: visitors may insert but never read inquiries (see RLS).
   * `project` is the portfolio project the visitor is asking about, if any. Only its id is
   * stored; the database looks up and saves its title itself.
   */
  async submit(
    input: InquiryInput,
    project?: Pick<Project, 'id' | 'title' | 'slug'> | null,
  ): Promise<void> {
    const { liked, timeline, ...core } = input;
    // Only send the newer columns when they have a value, so a plain inquiry is exactly
    // what it was before 0003_inquiry_context.sql.
    const extra: Record<string, unknown> = {};
    if (project) extra['project_id'] = project.id;
    if (liked?.length) extra['liked'] = liked;
    if (timeline) extra['timeline'] = timeline;

    const insert = (row: object) => this.sb.client.from('inquiries').insert(row);
    let { error } = await insert({ ...core, ...extra });

    if (error && Object.keys(extra).length && isMissingColumnError(error)) {
      // The database is a migration behind the app: keep the details in the message instead.
      const message = messageWithContext(core.message, { project, liked, timeline }, SITE.url);
      ({ error } = await insert({ ...core, message }));
    }

    if (error) {
      // P0001 = the friendly rate-limit message raised by the throttle_inquiries() trigger.
      if (error.code === 'P0001') throw new Error(error.message);
      throw new Error(
        'Sorry, your message could not be sent. Please try again or email us directly.',
      );
    }
  }

  // ------------------------------------------------------------- Admin

  async list(): Promise<Inquiry[]> {
    const { data, error } = await this.sb.client
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return data as Inquiry[];
  }

  /** Inquiries per project id. Empty if it can't be loaded (e.g. before migration 0003). */
  async countsByProject(): Promise<Map<string, number>> {
    try {
      const { data, error } = await this.sb.client
        .from('inquiries')
        .select('project_id')
        .not('project_id', 'is', null);
      return error ? new Map() : countByProject(data as Pick<Inquiry, 'project_id'>[]);
    } catch {
      return new Map();
    }
  }

  async setStatus(id: string, status: InquiryStatus): Promise<void> {
    const { error } = await this.sb.client.from('inquiries').update({ status }).eq('id', id);
    if (error) throw friendlyError(error);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.sb.client.from('inquiries').delete().eq('id', id);
    if (error) throw friendlyError(error);
  }
}
