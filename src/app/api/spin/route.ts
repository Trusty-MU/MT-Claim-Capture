import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Hand-written SPIN questions: AI generation is a starting point, not the authority.
export async function POST(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body.text?.trim() || !body.type) return NextResponse.json({ error: 'text and type required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('spin_questions')
    .insert({
      type: body.type,
      text: body.text.trim(),
      claim_id: body.claim_id ?? null,
      story_id: body.story_id ?? null,
      story_type: body.story_type ?? null,
      personas: body.personas ?? [],
      product_tags: body.product_tags ?? [],
      approved: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ question: data });
}
