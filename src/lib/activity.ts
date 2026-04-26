import { supabase } from './supabase';
import { EntityType } from '@/types';

export async function logActivity(
  entity_type: EntityType,
  entity_id: string,
  action: string,
  details?: Record<string, unknown>
) {
  const { error } = await supabase.from('mak_activity_log').insert({
    entity_type,
    entity_id,
    action,
    details
  });
  
  if (error) {
    console.error('Failed to log activity:', error);
  }
}
