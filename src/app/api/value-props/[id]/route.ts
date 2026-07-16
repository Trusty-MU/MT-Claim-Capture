import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const EDITABLE = ['text', 'status', 'personas', 'product_tags'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE) if (field in body) update[field] = body[field];
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('value_props').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ valueProp: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from('value_props').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
