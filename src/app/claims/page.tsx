import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { ClaimsBoard, type ClaimWithHealth } from './ClaimsBoard';
import type { Claim, Persona, ProductTag, StoryType, ValueProp } from '@/lib/types';

export default async function ClaimsPage() {
  const profile = await requireRole(['marketing']);
  const admin = createAdminClient();

  const [{ data: claims }, { data: links }, { data: personas }, { data: tags }, { data: valueProps }] =
    await Promise.all([
      admin.from('claims').select('*').order('status').order('title'),
      admin
        .from('claim_proof_points')
        .select('claim_id, proof_points(id, metric, value, unit, confidence, review, stories(story_type))'),
      admin.from('personas').select('*').order('name'),
      admin.from('product_tags').select('*').order('name'),
      admin.from('value_props').select('*').order('created_at', { ascending: false }),
    ]);

  type LinkRow = {
    claim_id: string;
    proof_points: {
      id: string;
      metric: string;
      value: string | null;
      unit: string | null;
      confidence: 'confirmed' | 'reported' | 'missing';
      review: string;
      stories: { story_type: StoryType | null } | null;
    } | null;
  };

  const enriched: ClaimWithHealth[] = ((claims ?? []) as Claim[]).map((claim) => {
    const rows = ((links ?? []) as unknown as LinkRow[]).filter((l) => l.claim_id === claim.id && l.proof_points);
    const proof = rows.map((r) => r.proof_points!);
    return {
      ...claim,
      proof_points: proof,
      confirmed_count: proof.filter((p) => p.confidence === 'confirmed').length,
      reported_count: proof.filter((p) => p.confidence === 'reported').length,
      missing_count: proof.filter((p) => p.confidence === 'missing').length,
      story_types: [...new Set(proof.map((p) => p.stories?.story_type).filter(Boolean))] as StoryType[],
    };
  });

  return (
    <AppShell profile={profile}>
      <ClaimsBoard
        claims={enriched}
        personas={(personas ?? []) as Persona[]}
        productTags={(tags ?? []) as ProductTag[]}
        valueProps={(valueProps ?? []) as ValueProp[]}
      />
    </AppShell>
  );
}
