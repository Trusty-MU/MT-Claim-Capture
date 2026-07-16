import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { generateValueProps } from '@/lib/ai/pipeline';

export const maxDuration = 120;

export async function POST(request: Request) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  try {
    const count = await generateValueProps({
      productTag: body.product_tag || undefined,
      persona: body.persona || undefined,
    });
    return NextResponse.json({ generated: count });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 });
  }
}
