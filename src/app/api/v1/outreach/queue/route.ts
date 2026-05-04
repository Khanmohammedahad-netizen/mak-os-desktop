import { NextResponse } from 'next/server'
import { processOutreachQueue } from '@/v1/lib/outreach-queue'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST() {
  try {
    const result = await processOutreachQueue(supabaseAdmin)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
