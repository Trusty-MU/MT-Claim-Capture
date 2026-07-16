import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ROLES = ['contributor', 'marketing', 'sales', 'leadership'];

// Role assignment, Marketing Owner only.
export async function PATCH(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body.user_id || !ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'user_id and a valid role required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('users').update({ role: body.role }).eq('id', body.user_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data });
}

// Invite a teammate by email (creates the auth user; they sign in by magic link).
export async function POST(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.role && ROLES.includes(body.role) && data.user) {
    await admin.from('users').update({ role: body.role }).eq('id', data.user.id);
  }
  return NextResponse.json({ ok: true });
}
