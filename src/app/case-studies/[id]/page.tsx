import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { CaseStudyBuilder } from './CaseStudyBuilder';
import type { CaseStudy, Claim, ProofPoint, SocialPost, Story } from '@/lib/types';

export default async function CaseStudyBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(['marketing']);
  const { id } = await params;
  const admin = createAdminClient();

  const { data: caseStudy } = await admin.from('case_studies').select('*').eq('id', id).single();
  if (!caseStudy) notFound();

  const [{ data: story }, { data: proofPoints }, { data: claims }, { data: socialPosts }] = await Promise.all([
    admin.from('stories').select('*').eq('id', caseStudy.story_id).single(),
    admin.from('proof_points').select('*').eq('story_id', caseStudy.story_id).neq('review', 'rejected').order('created_at'),
    admin.from('claims').select('*').neq('status', 'retired').order('title'),
    admin.from('social_posts').select('*').eq('case_study_id', id).order('created_at'),
  ]);

  return (
    <AppShell profile={profile}>
      <CaseStudyBuilder
        caseStudy={caseStudy as CaseStudy}
        story={story as Story}
        storyProofPoints={(proofPoints ?? []) as ProofPoint[]}
        allClaims={(claims ?? []) as Claim[]}
        socialPosts={(socialPosts ?? []) as SocialPost[]}
      />
    </AppShell>
  );
}
