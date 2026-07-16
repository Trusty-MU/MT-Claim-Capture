import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { CaseStudyStatusChip } from '@/components/brand/badges';
import { formatDate } from '@/lib/utils';
import type { CaseStudy } from '@/lib/types';

export default async function CaseStudiesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // RLS: contributors see published ones plus their own stories' drafts;
  // marketing sees everything.
  const { data } = await supabase
    .from('case_studies')
    .select('*, stories(client_name, commodity, location)')
    .order('created_at', { ascending: false });

  const caseStudies = (data ?? []) as (CaseStudy & { stories: { client_name: string | null; commodity: string | null; location: string | null } | null })[];
  const canEdit = profile.role === 'marketing';

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Case studies</h1>
      <p className="mt-2 text-mt-black-sand/70">Published proof, and what&apos;s on the way.</p>

      {caseStudies.length ? (
        <ul className="mt-6 divide-y-2 divide-mt-sand">
          {caseStudies.map((cs) => (
            <li key={cs.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={canEdit ? `/case-studies/${cs.id}` : `/share/case-study/${cs.id}`}
                  className="font-bold hover:text-mt-red-ore"
                >
                  {cs.title || cs.stories?.client_name || 'Untitled case study'}
                </Link>
                <p className="text-sm text-mt-black-sand/60">
                  {[cs.stories?.commodity, cs.stories?.location].filter(Boolean).join(' · ')} · {formatDate(cs.created_at)}
                </p>
              </div>
              <CaseStudyStatusChip status={cs.status} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 bg-mt-sand/50 p-8 text-center font-bold">No case studies yet.</div>
      )}
    </AppShell>
  );
}
