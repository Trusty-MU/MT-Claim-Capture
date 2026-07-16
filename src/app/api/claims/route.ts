import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('claims')
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      status: body.status ?? 'candidate',
      so_what: body.so_what ?? null,
      we_do_that_too: body.we_do_that_too ?? null,
      prove_it: body.prove_it ?? null,
      personas: body.personas ?? [],
      product_tags: body.product_tags ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ claim: data });
}
