import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authBypassEnabled, authBypassEmail, warnBypassOnce } from '@/lib/auth-bypass';
import type { Profile, UserRole } from '@/lib/types';

/**
 * Resolve a real row from public.users to act as when AUTH_BYPASS is on.
 * A real row matters because stories.contributor_id is a foreign key, so a
 * made-up id would fail the moment anyone captured anything.
 */
async function bypassProfile(): Promise<Profile | null> {
  warnBypassOnce();
  const admin = createAdminClient();
  const email = authBypassEmail();

  if (email) {
    const { data } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    if (data) return data as Profile;
    console.warn(`[MT Proof Engine] AUTH_BYPASS_EMAIL=${email} matched no user.`);
  }

  // Otherwise act as a marketing user, falling back to whoever exists.
  const { data: marketing } = await admin
    .from('users')
    .select('*')
    .eq('role', 'marketing')
    .limit(1)
    .maybeSingle();
  if (marketing) return marketing as Profile;

  const { data: anyUser } = await admin.from('users').select('*').limit(1).maybeSingle();
  if (anyUser) return anyUser as Profile;

  console.warn(
    '[MT Proof Engine] AUTH_BYPASS is on but public.users is empty. ' +
      'Create one with scripts/create-user.mjs, or the capture flow will fail ' +
      'on the contributor_id foreign key.'
  );
  return null;
}

export async function getProfile(): Promise<Profile | null> {
  if (authBypassEnabled()) return bypassProfile();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
  return (data as Profile) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  return profile;
}

export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect('/');
  return profile;
}

export function homeForRole(role: UserRole): string {
  switch (role) {
    case 'marketing':
      return '/review';
    case 'sales':
      return '/library';
    case 'leadership':
      return '/dashboard';
    default:
      return '/capture';
  }
}
