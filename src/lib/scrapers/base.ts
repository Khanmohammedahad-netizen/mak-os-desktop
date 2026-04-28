import { supabaseAdmin } from '@/lib/supabase-server';
import type { ScrapedLead } from '@/types/engine';

export interface ScraperSource {
  name: string;
  dailyQuota: number;
  search(
    query: string,
    location: string,
    opts?: { limit?: number; coords?: { lat: number; lng: number } }
  ): Promise<ScrapedLead[]>;
}

export async function incrementSourceHealth(
  source: string,
  success: boolean,
  error?: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const update: Record<string, unknown> = {
    source,
    date: today,
    requests_made: 1,
    requests_succeeded: success ? 1 : 0,
    requests_failed: success ? 0 : 1,
    ...(success ? { last_success_at: new Date().toISOString() } : { last_error: error ?? null }),
  };

  // Atomic upsert — Supabase will increment via RPC or we use raw SQL via rpc
  // Since we can't do atomic increments in Supabase JS client directly, we use
  // a read-then-write. Acceptable for low-concurrency cron workloads.
  const { data: existing } = await supabaseAdmin
    .from('source_health')
    .select('requests_made, requests_succeeded, requests_failed')
    .eq('source', source)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('source_health')
      .update({
        requests_made: existing.requests_made + 1,
        requests_succeeded: existing.requests_succeeded + (success ? 1 : 0),
        requests_failed: existing.requests_failed + (success ? 0 : 1),
        daily_quota: update.daily_quota,
        ...(success
          ? { last_success_at: new Date().toISOString() }
          : { last_error: error ?? null }),
      })
      .eq('source', source)
      .eq('date', today);
  } else {
    await supabaseAdmin.from('source_health').insert({
      source,
      date: today,
      requests_made: 1,
      requests_succeeded: success ? 1 : 0,
      requests_failed: success ? 0 : 1,
      ...(success
        ? { last_success_at: new Date().toISOString() }
        : { last_error: error ?? null }),
    });
  }
}

export async function getSourceHealth(
  source: string
): Promise<{ requests_made: number; requests_failed: number } | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from('source_health')
    .select('requests_made, requests_failed')
    .eq('source', source)
    .eq('date', today)
    .maybeSingle();
  return data ?? null;
}
