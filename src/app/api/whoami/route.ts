import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveProfile, profileFailureMessage } from '@/lib/auth';
import { authBypassEnabled } from '@/lib/auth-bypass';

// Answers the two questions behind a silent bounce back to /login: is there a
// session on this request, and is there a matching row in public.users.
// Reports only on the caller's own session, so it discloses nothing.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  let sessionEmail: string | null = null;
  let sessionUserId: string | null = null;
  if (!authBypassEnabled()) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    sessionEmail = user?.email ?? null;
    sessionUserId = user?.id ?? null;
  }

  const { profile, reason, detail } = await resolveProfile();

  return NextResponse.json({
    signedIn: authBypassEnabled() ? 'bypass' : Boolean(sessionUserId),
    session: { userId: sessionUserId, email: sessionEmail },
    profile: profile
      ? { id: profile.id, email: profile.email, name: profile.name, role: profile.role }
      : null,
    problem: reason ? { reason, message: profileFailureMessage(reason), detail: detail ?? null } : null,
  });
}
