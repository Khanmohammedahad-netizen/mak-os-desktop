import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface BlandEvent {
  call_id: string;
  status?: string;
  transcript?: string;
  duration?: number;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  let event: BlandEvent;
  try {
    event = (await req.json()) as BlandEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!event.call_id) {
    return new NextResponse(null, { status: 200 });
  }

  const { error } = await supabaseAdmin
    .from('outreach_logs')
    .update({
      status: event.status ?? 'unknown',
      metadata: event,
    })
    .eq('bland_call_id', event.call_id);

  if (error) {
    console.error('[webhook/bland] update error:', error.message, 'call_id:', event.call_id);
  }

  return new NextResponse(null, { status: 200 });
}
