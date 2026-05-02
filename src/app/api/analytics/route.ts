import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type');

  try {
    switch (type) {
      case 'overview': {
        const [{ data: contacts }, { data: deals }] = await Promise.all([
          supabaseAdmin.from('contacts').select('id'),
          supabaseAdmin.from('deals').select('id, stage, value'),
        ]);
        const active = deals?.filter((d) => !['won', 'lost', 'Closed Won', 'Closed Lost'].includes(d.stage)) ?? [];
        const won = deals?.filter((d) => ['won', 'Closed Won'].includes(d.stage)) ?? [];
        const lost = deals?.filter((d) => ['lost', 'Closed Lost'].includes(d.stage)) ?? [];
        return NextResponse.json({
          totalContacts: contacts?.length ?? 0,
          activeDeals: active.length,
          pipelineValue: active.reduce((s, d) => s + (Number(d.value) || 0), 0),
          winRate:
            won.length + lost.length > 0
              ? (won.length / (won.length + lost.length)) * 100
              : 0,
        });
      }

      case 'contacts-by-status': {
        const { data } = await supabaseAdmin.from('contacts').select('status');
        const groups: Record<string, number> = {};
        data?.forEach((c) => { groups[c.status] = (groups[c.status] || 0) + 1; });
        return NextResponse.json(
          Object.entries(groups).map(([status, count]) => ({ status, count }))
        );
      }

      case 'deals-by-stage': {
        const { data } = await supabaseAdmin.from('deals').select('stage, value');
        const groups: Record<string, { count: number; value: number }> = {};
        data?.forEach((d) => {
          if (!groups[d.stage]) groups[d.stage] = { count: 0, value: 0 };
          groups[d.stage].count++;
          groups[d.stage].value += Number(d.value) || 0;
        });
        return NextResponse.json(
          Object.entries(groups).map(([stage, { count, value }]) => ({ stage, count, value }))
        );
      }

      case 'pipeline-history': {
        const since = new Date();
        since.setMonth(since.getMonth() - 6);
        const { data } = await supabaseAdmin
          .from('deals')
          .select('value, created_at')
          .gte('created_at', since.toISOString());

        const monthMap: Record<string, number> = {};
        data?.forEach((d) => {
          const key = new Date(d.created_at).toLocaleString('en-US', { year: '2-digit', month: 'short' });
          monthMap[key] = (monthMap[key] || 0) + (Number(d.value) || 0);
        });

        const result = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const key = date.toLocaleString('en-US', { year: '2-digit', month: 'short' });
          result.push({
            month: date.toLocaleString('en-US', { month: 'short' }),
            value: monthMap[key] || 0,
          });
        }
        return NextResponse.json(result);
      }

      case 'lead-sources': {
        const { data } = await supabaseAdmin.from('contacts').select('source');
        const groups: Record<string, number> = {};
        data?.forEach((c) => {
          const src = c.source || 'Unknown';
          groups[src] = (groups[src] || 0) + 1;
        });
        return NextResponse.json(
          Object.entries(groups).map(([source, count]) => ({ source, count }))
        );
      }

      case 'activity-timeline': {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data } = await supabaseAdmin
          .from('activity')
          .select('created_at')
          .gte('created_at', since.toISOString());

        const dayMap: Record<string, number> = {};
        data?.forEach((a) => {
          const key = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dayMap[key] = (dayMap[key] || 0) + 1;
        });

        const result = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          result.push({ day: key, count: dayMap[key] || 0 });
        }
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
