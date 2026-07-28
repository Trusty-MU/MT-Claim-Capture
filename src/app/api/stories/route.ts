import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { isSyntheticProfile } from '@/lib/auth-bypass';

// Create a draft story. The capture flow saves everything against it as the
// contributor goes, so partial captures are never lost.
export async function POST(request: Request) {
  // Resolved through getProfile rather than reading the session directly, so
  // this works under AUTH_BYPASS as well as normal sign-in.
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));

  // The synthetic bypass identity is not a real row, and contributor_id
  // references users(id), so store null rather than violating the constraint.
  const contributorId = isSyntheticProfile(profile) ? null : profile.id;

  const { data, error } = await supabase
    .from('stories')
    .insert({ contributor_id: contributorId, story_type: body.story_type ?? null })
    .select()
    .single();

  if (error) {
    // The two failures worth naming, because the raw Postgres text does not
    // tell you what to actually do about them.
    let hint = '';
    if (/does not exist|schema cache/i.test(error.message)) {
      hint = ' The database schema does not appear to be applied. Run supabase/bootstrap.sql in the Supabase SQL editor.';
    } else if (/JWT|api key|invalid/i.test(error.message)) {
      hint = ' Check SUPABASE_SERVICE_ROLE_KEY is set correctly for this deployment.';
    }
    return NextResponse.json({ error: `${error.message}.${hint}` }, { status: 400 });
  }

  return NextResponse.json({ story: data });
}
