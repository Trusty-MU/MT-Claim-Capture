import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import type { Profile, UserRole } from '@/lib/types';

// Role gate for API routes. Returns the profile, or a ready-made 401/403.
// Resolves through getProfile so it honours AUTH_BYPASS the same way pages do;
// without that, API calls would 401 while pages rendered fine.
export async function requireApiRole(
  roles: UserRole[]
): Promise<{ profile: Profile; error: null } | { profile: null; error: NextResponse }> {
  const profile = await getProfile();

  if (!profile) {
    return { profile: null, error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) };
  }
  if (!roles.includes(profile.role)) {
    return { profile: null, error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) };
  }
  return { profile, error: null };
}
