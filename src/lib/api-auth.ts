import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/lib/types';

// Role gate for API routes. Returns the profile, or a ready-made 401/403.
export async function requireApiRole(
  roles: UserRole[]
): Promise<{ profile: Profile; error: null } | { profile: null; error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { profile: null, error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) };
  }
  const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
  const profile = data as Profile | null;
  if (!profile || !roles.includes(profile.role)) {
    return { profile: null, error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) };
  }
  return { profile, error: null };
}
