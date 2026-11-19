// Supabase Edge Function: emails the office when a new inquiry is saved.
//
// Triggered by a Database Webhook on INSERT into public.inquiries (see README).
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY   API key from https://resend.com
//   NOTIFY_TO        Office inbox that receives inquiries, e.g. hello@yourdomain.com
//   NOTIFY_FROM      Verified sender, e.g. "Exodus Website <website@yourdomain.com>"
//   WEBHOOK_SECRET   Random string; the webhook must send it in the x-webhook-secret header

interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  service: string | null;
  message: string;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: InquiryRecord | null;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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

  const service = r.service ? escapeHtml(r.service) : 'Not specified';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#172030">
      <h2 style="color:#0d2340;margin:0 0 16px">New website inquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(r.name)}<br>
         <strong>Email:</strong> <a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a><br>
         <strong>Service:</strong> ${service}</p>
      <div style="padding:16px;background:#f6f4ef;border-radius:8px;white-space:pre-wrap">${escapeHtml(r.message)}</div>
      <p style="color:#566174;font-size:13px;margin-top:24px">Reply to this email to answer ${escapeHtml(r.name)} directly.
      You can also find this message in the website admin under Inquiries.</p>
    </div>`;
  const text = `New website inquiry\n\nName: ${r.name}\nEmail: ${r.email}\nService: ${r.service ?? 'Not specified'}\n\n${r.message}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()),
      reply_to: r.email,
      subject: `New inquiry from ${r.name.slice(0, 80)}${r.service ? ` (${r.service})` : ''}`,
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
