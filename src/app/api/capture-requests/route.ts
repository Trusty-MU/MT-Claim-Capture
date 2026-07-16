import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

// Sales "capture this" requests.
export async function POST(request: Request) {
  const gate = await requireApiRole(['sales', 'marketing', 'leadership']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body.description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('capture_requests')
    .insert({
      requested_by: gate.profile.id,
      description: body.description.trim(),
      suggested_contributor: body.suggested_contributor ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ request: data });
}
