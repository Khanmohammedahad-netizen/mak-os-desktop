import { NextResponse } from 'next/server'
import { runOutreachPipeline } from '@/v1/lib/outreach-engine'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, city, maxResults, dryRun } = body

    if (!category || !city) {
      return NextResponse.json({ error: 'category and city are required' }, { status: 400 })
    }

    const result = await runOutreachPipeline(category, city, supabaseAdmin, {
      maxResults: maxResults || 20,
      dryRun: dryRun || false,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
