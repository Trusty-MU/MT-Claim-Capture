import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { generateSocialPosts } from '@/lib/ai/pipeline';

export const maxDuration = 120;

export async function POST(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body.case_study_id) return NextResponse.json({ error: 'case_study_id required' }, { status: 400 });

  try {
    const count = await generateSocialPosts(body.case_study_id);
    return NextResponse.json({ generated: count });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 });
  }
}
