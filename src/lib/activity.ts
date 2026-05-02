import { supabaseAdmin } from './supabase-server';
import { EntityType } from '@/types';

export async function logActivity(
  entity_type: EntityType,
  entity_id: string,
  action: string,
  details?: Record<string, unknown>
) {
  const { error } = await supabaseAdmin.from('activity').insert({
    entity_type,
    entity_id,
    action,
    details: details ?? {},
  });

  if (error) {
    console.error('[activity] Failed to log:', error.message);
  }
}
