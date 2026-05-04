import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, cronUnauthorized } from '@/v1/lib/cron-auth'
import { processOutreachQueue } from '@/v1/lib/outreach-queue'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return cronUnauthorized()
  try {
    const result = await processOutreachQueue(supabaseAdmin)
    return NextResponse.json({ status: 'complete', ...result })
  } catch (error: any) {
    return NextResponse.json({ status: 'failed', error: error.message }, { status: 200 })
  }
}
