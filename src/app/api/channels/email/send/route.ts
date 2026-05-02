import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance';
import { sendEmail } from '@/lib/channels/brevo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BodySchema = z.object({
  contact_id: z.string().uuid(),
  subject: z.string().min(1),
  html: z.string().min(1),
  replyTo: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: contact, error } = await supabaseAdmin
    .from('mak_contacts')
    .select('id, phone, email, country, marketing_consent')
    .eq('id', body.contact_id)
    .maybeSingle();

  if (error || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  if (!contact.email) {
    return NextResponse.json({ error: 'Contact has no email address' }, { status: 422 });
  }

  try {
    await gateOutbound({ contact, channel: 'email' });
  } catch (err) {
    if (err instanceof ComplianceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }

  const result = await sendEmail({
    to: contact.email,
    contactId: body.contact_id,
    subject: body.subject,
    html: body.html,
    replyTo: body.replyTo,
  });

  if (!result.ok && result.reason === 'DAILY_LIMIT_REACHED') {
    return NextResponse.json({ error: 'Daily email limit reached' }, { status: 429 });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
