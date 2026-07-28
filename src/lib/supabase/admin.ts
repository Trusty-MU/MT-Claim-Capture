import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { adminSupabaseEnv } from './env';

// Service-role client. Bypasses RLS. Server-side only: the AI pipeline,
// storage uploads/downloads and admin operations.
export function createAdminClient(): SupabaseClient {
  const { url, serviceRoleKey } = adminSupabaseEnv();
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
