import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Landing point for every emailed auth link: signup verification, password
// recovery, invites and email changes. Supabase sends either a PKCE `code` or
// a `token_hash` plus a `type` describing which flow the link belongs to.

const EMAIL_OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as string[]).includes(value);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  // Recovery and invite links must land on the form that sets a password:
  // recovery because the old one is being replaced, invite because an invited
  // account does not have one yet.
  const destination = type === 'recovery' || type === 'invite' ? '/auth/update-password' : next;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      // Older links omit `type`; 'email' is the general-purpose fallback.
      type: isEmailOtpType(type) ? type : 'email',
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('That link is missing its token. Request a new one.')}`);
}
