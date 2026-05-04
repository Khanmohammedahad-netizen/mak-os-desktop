import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { leadId, website } = await request.json();

    if (!leadId || !website) {
      return NextResponse.json({ error: 'leadId and website are required' }, { status: 400 });
    }

    // In a production app, we would call the Google PageSpeed Insights API here.
    // For this MVP, we simulate an audit result based on the website URL length.
    
    // Simulated audit delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedMobileScore = Math.floor(Math.random() * 40) + 30; // 30-70
    const simulatedDesktopScore = Math.floor(Math.random() * 30) + 60; // 60-90
    const simulatedSeoScore = Math.floor(Math.random() * 20) + 70; // 70-90

    const painPoints = [];
    if (simulatedMobileScore < 50) painPoints.push('Severe mobile performance issues (Load time > 4s)');
    if (simulatedSeoScore < 80) painPoints.push('Missing critical SEO meta tags');
    if (Math.random() > 0.5) painPoints.push('Images are not optimized for web (Next-gen formats missing)');
    if (Math.random() > 0.7) painPoints.push('Text elements do not have sufficient color contrast');

    const leadScore = Math.floor(((100 - simulatedMobileScore) + (100 - simulatedSeoScore)) / 2);

    const auditData = {
      mobile_score: simulatedMobileScore,
      desktop_score: simulatedDesktopScore,
      seo_score: simulatedSeoScore,
      pain_points: painPoints,
      screenshot_url: `https://image.thum.io/get/width/600/crop/800/${website}` // Free screenshot service
    };

    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        status: 'audited',
        lead_score: leadScore,
        audit_data: auditData,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, auditData, leadScore });
  } catch (error: any) {
    console.error('Audit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
