import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { normalizePhone } from '@/lib/channels/normalize-phone';
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance';
import { triggerCall, ChannelDisabledError } from '@/lib/channels/bland';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BodySchema = z.object({
  contact_id: z.string().uuid(),
  scriptId: z.string().min(1),
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

  const phone = normalizePhone(contact.phone ?? '');
  if (!phone) {
    return NextResponse.json({ error: 'Contact has no valid phone number' }, { status: 422 });
  }

  try {
    await gateOutbound({ contact: { ...contact, phone }, channel: 'voice' });
  } catch (err) {
    if (err instanceof ComplianceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }

  try {
    const result = await triggerCall({
      to: phone,
      contactId: body.contact_id,
      scriptOrPathway: body.scriptId,
      leadContext: {},
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ChannelDisabledError) {
      return NextResponse.json({ error: 'Voice channel is not configured' }, { status: 503 });
    }
    throw err;
  }
}
