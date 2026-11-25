// Supabase Edge Function: emails the office when a new inquiry is saved.
//
// Triggered by a Database Webhook on INSERT into public.inquiries (see README).
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY   API key from https://resend.com
//   NOTIFY_TO        Inbox(es) that receive inquiries, comma-separated, e.g. a@gmail.com,b@gmail.com
//   NOTIFY_FROM      Verified sender, e.g. "Exodus Website <website@yourdomain.com>"
//   WEBHOOK_SECRET   Random string; the webhook must send it in the x-webhook-secret header
// Optional:
//   SITE_URL         Live site origin for links in the email (default https://exodushomeoffice.com)

/** Mirrors public.inquiries. Fields added by later migrations are optional (absent before them). */
interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
  created_at: string;
  // 0003_inquiry_context.sql. project_title/project_slug are written by the database, not the visitor.
  project_id?: string | null;
  project_title?: string | null;
  project_slug?: string | null;
  liked?: string[] | null;
  timeline?: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: InquiryRecord | null;
}

const DEFAULT_SITE_URL = 'https://exodushomeoffice.com';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** One line, limited length: safe for a subject header. */
const oneLine = (s: string, max: number) => {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

function siteUrl(): string {
  const value = (Deno.env.get('SITE_URL') ?? '').trim().replace(/\/+$/, '');
  return /^https:\/\/[^\s/]+$/.test(value) ? value : DEFAULT_SITE_URL;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const r = payload.record;
  if (payload.type !== 'INSERT' || payload.table !== 'inquiries' || !r) {
    return new Response('Ignored', { status: 200 });
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('NOTIFY_TO');
  const from = Deno.env.get('NOTIFY_FROM');
  if (!apiKey || !to || !from) {
    console.error('notify-inquiry: missing RESEND_API_KEY, NOTIFY_TO or NOTIFY_FROM');
    return new Response('Not configured', { status: 500 });
  }

  const site = siteUrl();
  const projectTitle = r.project_title || null;
  const projectUrl = projectTitle && r.project_slug ? `${site}/portfolio/${encodeURIComponent(r.project_slug)}` : null;
  const liked = (r.liked ?? []).filter(Boolean);
  const timeline = r.timeline || null;
  const adminUrl = `${site}/admin/inquiries`;

  const service = r.service ? escapeHtml(r.service) : 'Not specified';
  const project = projectTitle
    ? projectUrl
      ? `<a href="${escapeHtml(projectUrl)}">${escapeHtml(projectTitle)}</a>`
      : escapeHtml(projectTitle)
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#172030">
      <h2 style="color:#0d2340;margin:0 0 16px">New website inquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(r.name)}<br>
         <strong>Email:</strong> <a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a><br>
         <strong>Service:</strong> ${service}${project ? `<br>
         <strong>Wants something like:</strong> ${project}` : ''}${liked.length ? `<br>
         <strong>Liked:</strong> ${escapeHtml(liked.join(', '))}` : ''}${timeline ? `<br>
         <strong>Timeline:</strong> ${escapeHtml(timeline)}` : ''}</p>
      <div style="padding:16px;background:#f6f4ef;border-radius:8px;white-space:pre-wrap">${escapeHtml(r.message)}</div>
      <p style="color:#566174;font-size:13px;margin-top:24px">Reply to this email to answer ${escapeHtml(r.name)} directly.
      You can also find this message in the website admin under <a href="${escapeHtml(adminUrl)}">Inquiries</a>.</p>
    </div>`;

  const textLines = [
    'New website inquiry',
    '',
    `Name: ${r.name}`,
    `Email: ${r.email}`,
    `Service: ${r.service ?? 'Not specified'}`,
  ];
  if (projectTitle) textLines.push(`Wants something like: ${projectTitle}${projectUrl ? ` (${projectUrl})` : ''}`);
  if (liked.length) textLines.push(`Liked: ${liked.join(', ')}`);
  if (timeline) textLines.push(`Timeline: ${timeline}`);
  textLines.push('', r.message, '', `Admin: ${adminUrl}`);
  const text = textLines.join('\n');

  const subject =
    `New inquiry from ${oneLine(r.name, 80)}` +
    (r.service ? ` (${oneLine(r.service, 80)})` : '') +
    (projectTitle ? ` · like "${oneLine(projectTitle, 80)}"` : '');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()),
      reply_to: r.email,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error('notify-inquiry: Resend error', res.status, await res.text());
    return new Response('Email failed', { status: 502 });
  }
  return new Response('Sent', { status: 200 });
});
