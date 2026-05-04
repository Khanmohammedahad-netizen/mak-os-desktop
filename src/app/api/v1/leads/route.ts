import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ leads })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, company, email } = body
    const companyName = company || name

    if (!companyName || !email) {
      return NextResponse.json({ error: 'Company name and email are required' }, { status: 400 })
    }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert([{ company: companyName, email, status: 'new' }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ lead }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
