import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { generateSpinQuestions } from '@/lib/ai/pipeline';

export const maxDuration = 120;

export async function POST(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body.claim_id) return NextResponse.json({ error: 'claim_id required' }, { status: 400 });

  try {
    const count = await generateSpinQuestions(body.claim_id);
    return NextResponse.json({ generated: count });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 });
  }
}
