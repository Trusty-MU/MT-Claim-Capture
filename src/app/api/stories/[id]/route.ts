import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CONTRIBUTOR_FIELDS = ['story_type', 'client_name', 'commodity', 'location'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  for (const field of CONTRIBUTOR_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // RLS restricts this to the contributor's own draft or the Marketing Owner.
  const { data, error } = await supabase.from('stories').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ story: data });
}
