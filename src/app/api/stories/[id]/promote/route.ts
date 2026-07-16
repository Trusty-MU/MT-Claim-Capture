import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Promote a reviewed story to a Case Study draft, prefilled from the brief.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const { id: storyId } = await params;
  const admin = createAdminClient();

  const { data: existing } = await admin.from('case_studies').select('id').eq('story_id', storyId).maybeSingle();
  if (existing) return NextResponse.json({ caseStudy: existing, existed: true });

  const { data: story } = await admin.from('stories').select('*').eq('id', storyId).single();
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  const { data: brief } = await admin
    .from('briefs')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: confirmedProof } = await admin
    .from('proof_points')
    .select('id')
    .eq('story_id', storyId)
    .eq('review', 'confirmed')
    .limit(4);

  const { data: links } = confirmedProof?.length
    ? await admin
        .from('claim_proof_points')
        .select('claim_id')
        .in('proof_point_id', confirmedProof.map((p) => p.id))
    : { data: [] as { claim_id: string }[] };

  const metaStrip = [story.commodity, story.location, story.current_status].filter(Boolean).join(' | ');

  const { data: caseStudy, error } = await admin
    .from('case_studies')
    .insert({
      story_id: storyId,
      status: 'draft',
      title: story.client_name ? `${story.client_name}` : 'Untitled case study',
      meta_strip: metaStrip || null,
      pullquote: brief?.pullquote_suggestion ?? null,
      challenge: brief?.challenge_draft ?? null,
      approach: brief?.approach_draft ?? null,
      featured_proof_point_ids: (confirmedProof ?? []).map((p) => p.id),
      featured_claim_ids: [...new Set((links ?? []).map((l) => l.claim_id))],
      cta_text: 'Talk to us about what your ore body can support.',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('stories').update({ status: 'reviewed' }).eq('id', storyId);
  return NextResponse.json({ caseStudy });
}
