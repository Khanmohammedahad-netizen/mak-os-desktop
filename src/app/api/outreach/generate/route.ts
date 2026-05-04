import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) throw new Error('Lead not found');

    // 2. Fetch OpenRouter Key
    const { data: settings } = await supabaseAdmin
      .from('api_settings')
      .select('value')
      .eq('key', 'OPENROUTER_API_KEY')
      .single();

    const apiKey = settings?.value || process.env.OPENROUTER_API_KEY;

    let generatedMessage = '';

    if (!apiKey) {
      // Mock generation if no API key
      await new Promise(r => setTimeout(r, 1000));
      generatedMessage = `Hi team at ${lead.business_name},\n\nI noticed some issues with your website's performance and mobile experience during a recent audit. Fixing these could significantly improve your customer acquisition.\n\nLet's chat about how we can help.`;
    } else {
      // Call OpenRouter
      const prompt = `You are an expert sales SDR. Write a short, punchy, cold email to ${lead.business_name}. 
Their niche is ${lead.category || lead.niche}. 
Our audit found these issues with their site: ${(lead.audit_data as any)?.pain_points?.join(', ')}. 
Mention one issue casually, don't be salesy, keep it under 4 sentences. Ask for a quick chat.`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku', // Fast and cheap
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) {
         throw new Error(`OpenRouter error: ${res.statusText}`);
      }

      const aiData = await res.json();
      generatedMessage = aiData.choices?.[0]?.message?.content || 'Failed to generate message.';
    }

    return NextResponse.json({ success: true, message: generatedMessage });
  } catch (error: any) {
    console.error('Generate message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
