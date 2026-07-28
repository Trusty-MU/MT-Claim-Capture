import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicSupabaseEnv } from './env';
import { createAdminClient } from './admin';
import { authBypassEnabled, warnBypassOnce } from '@/lib/auth-bypass';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// RLS-scoped client for the signed-in user (server components and routes).
export async function createClient() {
  // With AUTH_BYPASS on there is no session, so every RLS policy would deny.
  // Hand back the service-role client instead; access control in that mode is
  // "whoever can reach the URL", which is the documented trade-off.
  if (authBypassEnabled()) {
    warnBypassOnce();
    return createAdminClient();
  }

  const cookieStore = await cookies();

  const { url, anonKey } = publicSupabaseEnv();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; middleware refreshes sessions.
          }
        },
      },
    }
  );
}
