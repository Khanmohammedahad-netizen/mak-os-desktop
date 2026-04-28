import { createClient as _createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Service role key for server-side writes; falls back to anon key (open RLS policies)
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseAdmin = _createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Factory function for server-side Supabase access.
 * Returns the service-role admin client. Exported as a factory so that
 * channel modules can import `createClient` and be mocked cleanly in tests.
 */
export function createClient() {
  return supabaseAdmin;
}
