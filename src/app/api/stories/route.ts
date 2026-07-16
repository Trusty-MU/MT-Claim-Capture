import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Create a draft story. The capture flow saves everything against it as the
// contributor goes, so partial captures are never lost.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('stories')
    .insert({ contributor_id: user.id, story_type: body.story_type ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ story: data });
}
