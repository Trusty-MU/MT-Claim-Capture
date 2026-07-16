import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSocialPosts } from '@/lib/ai/pipeline';

const EDITABLE = [
  'title',
  'meta_strip',
  'pullquote',
  'challenge',
  'approach',
  'featured_proof_point_ids',
  'featured_claim_ids',
  'cta_text',
  'status',
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE) if (field in body) update[field] = body[field];
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const admin = createAdminClient();

  const { data: before } = await admin.from('case_studies').select('status').eq('id', id).single();

  if (update.status === 'published' && before?.status !== 'published') {
    update.published_at = new Date().toISOString();
    update.published_url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/share/case-study/${id}`;
  }

  const { data, error } = await admin.from('case_studies').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Stage 4 trigger: social post ideas on publication. Non-fatal on failure.
  if (update.status === 'published' && before?.status !== 'published') {
    generateSocialPosts(id).catch((err) => console.error('Social generation failed:', err));
  }

  return NextResponse.json({ caseStudy: data });
}
