// Shareable web view of a case study. Public once published (no sign-in
// needed); unpublished ones require a signed-in marketing user.

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { CaseStudyTemplate } from '@/components/case-study/CaseStudyTemplate';
import { PrintButton } from './PrintButton';
import type { CaseStudy, Claim, ProofPoint } from '@/lib/types';

export default async function ShareCaseStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;
  const admin = createAdminClient();

  const { data } = await admin.from('case_studies').select('*').eq('id', id).single();
  const caseStudy = data as CaseStudy | null;
  if (!caseStudy) notFound();

  if (caseStudy.status !== 'published') {
    const profile = await getProfile();
    if (!profile || profile.role !== 'marketing') notFound();
  }

  const [{ data: proofPoints }, { data: claims }] = await Promise.all([
    caseStudy.featured_proof_point_ids.length
      ? admin.from('proof_points').select('*').in('id', caseStudy.featured_proof_point_ids)
      : Promise.resolve({ data: [] as ProofPoint[] }),
    caseStudy.featured_claim_ids.length
      ? admin.from('claims').select('*').in('id', caseStudy.featured_claim_ids)
      : Promise.resolve({ data: [] as Claim[] }),
  ]);

  // Keep the builder's chosen stat order
  const ordered = caseStudy.featured_proof_point_ids
    .map((ppId) => ((proofPoints ?? []) as ProofPoint[]).find((p) => p.id === ppId))
    .filter(Boolean) as ProofPoint[];

  return (
    <div className="min-h-screen bg-mt-sand py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="no-print mb-4 flex justify-end">
          <PrintButton autoPrint={print === '1'} />
        </div>
        <CaseStudyTemplate caseStudy={caseStudy} proofPoints={ordered} claims={(claims ?? []) as Claim[]} />
      </div>
    </div>
  );
}
