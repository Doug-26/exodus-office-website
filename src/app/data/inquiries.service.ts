import { inject, Injectable } from '@angular/core';
import { Supabase } from '../core/supabase';
import { Inquiry, InquiryInput, InquiryStatus } from './models';
import { friendlyError } from './projects.service';

@Injectable({ providedIn: 'root' })
export class InquiriesService {
  private readonly sb = inject(Supabase);

  get configured(): boolean {
    return this.sb.configured;
  }

  /** Public: visitors may insert but never read inquiries (see RLS). */
  async submit(input: InquiryInput): Promise<void> {
    const { error } = await this.sb.client.from('inquiries').insert(input);
    if (error) throw new Error('Sorry, your message could not be sent. Please try again or email us directly.');
  }

  // ------------------------------------------------------------- Admin

  async list(): Promise<Inquiry[]> {
    const { data, error } = await this.sb.client.from('inquiries').select('*').order('created_at', { ascending: false });
    if (error) throw friendlyError(error);
    return data as Inquiry[];
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
