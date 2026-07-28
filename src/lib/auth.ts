import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  authBypassEnabled,
  authBypassEmail,
  warnBypassOnce,
  syntheticProfile,
} from '@/lib/auth-bypass';
import type { Profile, UserRole } from '@/lib/types';

/**
 * Why a profile could not be resolved. Kept distinct because the two failures
 * look identical from the outside (bounced back to /login) but have completely
 * different causes: no session means the cookie never arrived, no profile row
 * means the account exists in auth but was never mirrored into public.users.
 */
export type ProfileFailure = 'no-session' | 'no-profile-row' | 'lookup-failed';

export interface ProfileResult {
  profile: Profile | null;
  reason?: ProfileFailure;
  detail?: string;
}

const FAILURE_MESSAGES: Record<ProfileFailure, string> = {
  // Covers both "never signed in" and "signed in but the cookie did not
  // arrive", so it has to read correctly either way.
  'no-session':
    'No session on this request. If you just signed in, the session cookie is not reaching the server; check that NEXT_PUBLIC_SITE_URL matches the domain you are actually using.',
  'no-profile-row':
    'Your account exists but has no profile record, and one could not be created. Has the database schema been applied?',
  'lookup-failed': 'Could not read your profile from the database.',
};

export function profileFailureMessage(reason: ProfileFailure): string {
  return FAILURE_MESSAGES[reason];
}

/**
 * Resolve a real row from public.users to act as when AUTH_BYPASS is on.
 * A real row matters because stories.contributor_id is a foreign key, so a
 * made-up id would fail the moment anyone captured anything.
 */
async function bypassProfile(): Promise<Profile> {
  warnBypassOnce();

  // Prefer a real row so contributor_id and requested_by point at something,
  // but never fail: an empty or unmigrated database must still render.
  try {
    const admin = createAdminClient();
    const email = authBypassEmail();

    if (email) {
      const { data } = await admin.from('users').select('*').eq('email', email).maybeSingle();
      if (data) return data as Profile;
      console.warn(`[MT Proof Engine] AUTH_BYPASS_EMAIL=${email} matched no user.`);
    }

    const { data: marketing } = await admin
      .from('users')
      .select('*')
      .eq('role', 'marketing')
      .limit(1)
      .maybeSingle();
    if (marketing) return marketing as Profile;

    const { data: anyUser } = await admin.from('users').select('*').limit(1).maybeSingle();
    if (anyUser) return anyUser as Profile;
  } catch (err) {
    console.warn(
      `[MT Proof Engine] Could not read public.users under AUTH_BYPASS: ${
        err instanceof Error ? err.message : 'unknown error'
      }`
    );
  }

  console.warn(
    '[MT Proof Engine] AUTH_BYPASS is on with no usable row in public.users, ' +
      'so a synthetic identity is being used. Reads work; anything recording a ' +
      'contributor stores null. Run scripts/create-user.mjs for a real one.'
  );
  return syntheticProfile();
}

export async function resolveProfile(): Promise<ProfileResult> {
  if (authBypassEnabled()) return { profile: await bypassProfile() };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { profile: null, reason: 'no-session' };

  const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  if (data) return { profile: data as Profile };
  if (error) {
    console.error('[MT Proof Engine] Profile lookup failed:', error.message);
    return { profile: null, reason: 'lookup-failed', detail: error.message };
  }

  // Authenticated with no profile row. handle_new_user() should have created
  // one on signup; it will not have if the account predates the schema. Create
  // it now rather than bouncing to /login with nothing to explain why.
  console.warn(
    `[MT Proof Engine] No public.users row for ${user.email}; creating one. ` +
      'This usually means the account was created before the schema was applied.'
  );

  const admin = createAdminClient();
  const { data: created, error: insertError } = await admin
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email,
        name: (user.user_metadata?.name as string | undefined) ?? user.email?.split('@')[0] ?? null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (created) return { profile: created as Profile };

  console.error(
    `[MT Proof Engine] Could not create a profile row for ${user.email}: ${insertError?.message}`
  );
  return { profile: null, reason: 'no-profile-row', detail: insertError?.message };
}

export async function getProfile(): Promise<Profile | null> {
  return (await resolveProfile()).profile;
}

export async function requireProfile(): Promise<Profile> {
  const { profile, reason } = await resolveProfile();
  if (profile) return profile;

  // Redirect with the reason attached. Bouncing silently is what made this
  // look like "nothing happened" rather than a specific, fixable problem.
  const message = reason ? profileFailureMessage(reason) : 'Please sign in.';
  redirect(reason === 'no-session' ? '/login' : `/login?error=${encodeURIComponent(message)}`);
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
