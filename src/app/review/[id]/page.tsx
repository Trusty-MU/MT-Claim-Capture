import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { ReviewDetail } from './ReviewDetail';
import type { Brief, Claim, ClientQuote, Gap, ProofPoint, Story, StoryInput } from '@/lib/types';

export interface InputWithUrl extends StoryInput {
  signed_url: string | null;
}

export interface ProofPointWithClaims extends ProofPoint {
  claim_ids: string[];
}

export default async function ReviewStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(['marketing']);
  const { id } = await params;

  // Marketing Owner sees everything; the admin client also signs storage URLs
  // for voice note playback and file previews.
  const admin = createAdminClient();

  const { data: story } = await admin.from('stories').select('*').eq('id', id).single();
  if (!story) notFound();

  const [{ data: brief }, { data: inputs }, { data: proofPoints }, { data: quotes }, { data: gaps }, { data: claims }] =
    await Promise.all([
      admin.from('briefs').select('*').eq('story_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('story_inputs').select('*').eq('story_id', id).order('question_number', { ascending: true, nullsFirst: false }),
      admin.from('proof_points').select('*').eq('story_id', id).order('created_at'),
      admin.from('client_quotes').select('*').eq('story_id', id).order('created_at'),
      admin.from('gaps').select('*').eq('story_id', id).order('created_at'),
      admin.from('claims').select('*').neq('status', 'retired').order('title'),
    ]);

  const inputsWithUrls: InputWithUrl[] = await Promise.all(
    ((inputs ?? []) as StoryInput[]).map(async (input) => {
      let signed_url: string | null = null;
      if (input.storage_path) {
        const bucket = input.kind === 'voice' ? 'voice-notes' : 'story-files';
        const { data } = await admin.storage.from(bucket).createSignedUrl(input.storage_path, 3600);
        signed_url = data?.signedUrl ?? null;
      }
      return { ...input, signed_url };
    })
  );

  const { data: links } = await admin
    .from('claim_proof_points')
    .select('claim_id, proof_point_id')
    .in('proof_point_id', (proofPoints ?? []).map((p) => p.id).concat(['00000000-0000-0000-0000-000000000000']));

  const proofWithClaims: ProofPointWithClaims[] = ((proofPoints ?? []) as ProofPoint[]).map((pp) => ({
    ...pp,
    claim_ids: (links ?? []).filter((l) => l.proof_point_id === pp.id).map((l) => l.claim_id),
  }));

  const { data: existingCaseStudy } = await admin.from('case_studies').select('id').eq('story_id', id).maybeSingle();

  return (
    <AppShell profile={profile}>
      <ReviewDetail
        story={story as Story}
        brief={(brief as Brief) ?? null}
        inputs={inputsWithUrls}
        proofPoints={proofWithClaims}
        quotes={(quotes ?? []) as ClientQuote[]}
        gaps={(gaps ?? []) as Gap[]}
        claims={(claims ?? []) as Claim[]}
        existingCaseStudyId={existingCaseStudy?.id ?? null}
      />
    </AppShell>
  );
}
