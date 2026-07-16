import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Polled by the contributor's result screen and the review queue.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = await params;
  const supabase = await createClient();

  const { data: story } = await supabase
    .from('stories')
    .select('id, status, pipeline_stage, pipeline_error, client_name')
    .eq('id', storyId)
    .single();
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  let brief = null;
  if (['brief_ready', 'in_review', 'reviewed'].includes(story.status)) {
    const { data } = await supabase
      .from('briefs')
      .select('snapshot_json, challenge_draft, approach_draft, pullquote_suggestion, raw_json')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    brief = data;
  }

  return NextResponse.json({ story, brief });
}
