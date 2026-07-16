import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runPipeline } from '@/lib/ai/pipeline';

export const maxDuration = 300;

// Submit fires the AI pipeline. The response returns immediately; the result
// screen polls status until the brief is ready (target: ~60 seconds).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: storyId } = await params;
  const supabase = await createClient();

  const { data: story } = await supabase.from('stories').select('id, status').eq('id', storyId).single();
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  if (!['draft', 'submitted'].includes(story.status)) {
    return NextResponse.json({ error: 'Story already processed' }, { status: 409 });
  }

  await supabase
    .from('stories')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', storyId);

  after(async () => {
    await runPipeline(storyId);
  });

  return NextResponse.json({ ok: true });
}
