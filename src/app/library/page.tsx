import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { SalesLibrary, type LibraryClaim } from './SalesLibrary';
import type { CaseStudy, Claim, Persona, ProductTag, ProofPoint, SpinQuestion, StoryType } from '@/lib/types';

export default async function LibraryPage() {
  const profile = await requireRole(['sales', 'marketing', 'leadership']);
  const supabase = await createClient();

  const [{ data: claims }, { data: links }, { data: spin }, { data: caseStudies }, { data: personas }, { data: tags }] =
    await Promise.all([
      supabase.from('claims').select('*').in('status', ['proven', 'developing']).order('status', { ascending: false }),
      supabase.from('claim_proof_points').select('claim_id, proof_points(*, stories(client_name, story_type))'),
      supabase.from('spin_questions').select('*').eq('approved', true).order('type'),
      supabase
        .from('case_studies')
        .select('*, stories(client_name, commodity, location, story_type, product_tags)')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase.from('personas').select('*').order('name'),
      supabase.from('product_tags').select('*').order('name'),
    ]);

  type LinkRow = { claim_id: string; proof_points: (ProofPoint & { stories: { client_name: string | null; story_type: StoryType | null } | null }) | null };

  const libraryClaims: LibraryClaim[] = ((claims ?? []) as Claim[]).map((claim) => ({
    ...claim,
    proof: ((links ?? []) as unknown as LinkRow[])
      .filter((l) => l.claim_id === claim.id && l.proof_points)
      .map((l) => l.proof_points!)
      // best proof first: confirmed, then reported; missing last
      .sort((a, b) => ['confirmed', 'reported', 'missing'].indexOf(a.confidence) - ['confirmed', 'reported', 'missing'].indexOf(b.confidence)),
  }));

  return (
    <AppShell profile={profile}>
      <SalesLibrary
        claims={libraryClaims}
        spinQuestions={(spin ?? []) as SpinQuestion[]}
        caseStudies={(caseStudies ?? []) as (CaseStudy & { stories: { client_name: string | null; commodity: string | null; location: string | null; story_type: StoryType | null; product_tags: string[] } | null })[]}
        personas={(personas ?? []) as Persona[]}
        productTags={(tags ?? []) as ProductTag[]}
      />
    </AppShell>
  );
}
