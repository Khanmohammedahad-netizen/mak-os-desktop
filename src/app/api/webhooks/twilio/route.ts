import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyTwilioSignature } from '@/lib/channels/twilio';

export const dynamic = 'force-dynamic';

// Twilio sends form-encoded bodies — we need the raw text to verify the signature.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-twilio-signature') ?? '';
  const url = req.url;

  const rawBody = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody)) {
    params[k] = v;
  }

  if (!verifyTwilioSignature(signature, url, params)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Status update — Twilio posts MessageStatus for outbound messages
  if (params['MessageStatus'] && params['MessageSid']) {
    const { error } = await supabaseAdmin
      .from('outreach_logs')
      .update({ status: params['MessageStatus'] })
      .eq('twilio_sid', params['MessageSid']);

    if (error) console.error('[webhook/twilio] status update error:', error.message);
    return new NextResponse(null, { status: 200 });
  }

  // Inbound message
  if (params['Body'] && params['From']) {
    const from = params['From'].replace(/^whatsapp:/, '');
    const { error } = await supabaseAdmin.from('outreach_logs').insert({
      channel: 'whatsapp',
      direction: 'inbound',
      status: 'received',
      body: params['Body'],
      twilio_sid: params['MessageSid'] ?? null,
      metadata: params,
    });

    if (error) console.error('[webhook/twilio] inbound insert error:', error.message);

    // Resolve contact_id from phone for future use
    const { data: contact } = await supabaseAdmin
      .from('mak_contacts')
      .select('id')
      .eq('phone', from)
      .maybeSingle();

    if (contact?.id) {
      await supabaseAdmin
        .from('outreach_logs')
        .update({ contact_id: contact.id })
        .eq('twilio_sid', params['MessageSid'])
        .eq('direction', 'inbound');
    }

    return new NextResponse(null, { status: 200 });
  }

  return new NextResponse(null, { status: 200 });
}
