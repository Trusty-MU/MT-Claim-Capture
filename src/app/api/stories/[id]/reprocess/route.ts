import { NextResponse, after } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { runPipeline } from '@/lib/ai/pipeline';

export const maxDuration = 300;

// Re-run the pipeline (after a failure, or when corrections arrived).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const { id: storyId } = await params;
  after(async () => {
    await runPipeline(storyId);
  });
  return NextResponse.json({ ok: true });
}
