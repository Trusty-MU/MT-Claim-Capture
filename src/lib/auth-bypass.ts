// Development escape hatch: run the app with no sign-in.
//
// This turns the whole app into an open, fully-privileged surface. Everything
// in here is client-confidential: named clients, unapproved numbers, quotes
// marked internal_only, unpublished case studies. Use it to click through the
// app while auth is being sorted out, not on anything reachable by people who
// should not see that material.
//
// Off unless AUTH_BYPASS is exactly "true". Deliberately not NEXT_PUBLIC_, so
// it can never be switched on from the browser bundle.

import type { Profile } from '@/lib/types';

export function authBypassEnabled(): boolean {
  return process.env.AUTH_BYPASS === 'true';
}

/** Which existing account to act as. Falls back to the first marketing user. */
export function authBypassEmail(): string | null {
  return process.env.AUTH_BYPASS_EMAIL?.trim() || null;
}

/**
 * Identity used when the database has no usable user row, so the bypass works
 * on an empty or unmigrated database instead of bouncing to /login. It is not
 * a real row, so it must never be written into a column that references
 * users(id); isSyntheticProfile() guards those inserts.
 */
export const SYNTHETIC_PROFILE_ID = '00000000-0000-4000-8000-000000000000';

export function syntheticProfile(): Profile {
  return {
    id: SYNTHETIC_PROFILE_ID,
    email: 'bypass@localhost',
    name: 'Bypass user',
    role: 'marketing',
    created_at: new Date(0).toISOString(),
  };
}

export function isSyntheticProfile(profile: Pick<Profile, 'id'> | null | undefined): boolean {
  return profile?.id === SYNTHETIC_PROFILE_ID;
}

let warned = false;

/** Logs once per process so the mode is visible in deployment logs. */
export function warnBypassOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    '[MT Proof Engine] AUTH_BYPASS is on. Sign-in is disabled and every ' +
      'request runs with full marketing privileges. Do not leave this set on ' +
      'anything holding real client data.'
  );
}
