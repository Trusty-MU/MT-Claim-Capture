import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role client. Bypasses RLS. Server-side only: the AI pipeline,
// storage uploads/downloads and admin operations.
export function createAdminClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
