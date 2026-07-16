import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { ClaimHealthDot, StoryTypeBadge } from '@/components/brand/badges';
import { formatDate } from '@/lib/utils';
import type { Claim, ClaimStatus, ConfidenceLevel, Gap, StoryType } from '@/lib/types';
import { STORY_TYPE_SHORT } from '@/lib/types';

const STORY_TYPES = Object.keys(STORY_TYPE_SHORT) as StoryType[];

export default async function DashboardPage() {
  const profile = await requireRole(['marketing', 'leadership']);
  const admin = createAdminClient();

  const [{ data: stories }, { data: claims }, { data: proofPoints }, { data: links }, { data: gaps }, { data: pendingApprovals }, { data: captureRequests }] =
    await Promise.all([
      admin.from('stories').select('id, status, story_type, created_at').neq('status', 'draft'),
      admin.from('claims').select('*'),
      admin.from('proof_points').select('id, confidence, approval, story_id, metric, value'),
      admin.from('claim_proof_points').select('claim_id, proof_point_id'),
      admin.from('gaps').select('*, stories(client_name)').neq('status', 'resolved').order('created_at').limit(10),
      admin
        .from('proof_points')
        .select('id, metric, value, unit, stories(client_name)')
        .eq('approval', 'needs_approval')
        .eq('review', 'confirmed')
        .limit(10),
      admin.from('capture_requests').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
    ]);

  // Stories per month (last 6 months)
  const months: { key: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-AU', { month: 'short' }),
      count: 0,
    });
  }
  for (const s of stories ?? []) {
    const d = new Date(s.created_at);
    const m = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.count++;
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  // Claims by lifecycle
  const byStatus: Record<ClaimStatus, number> = { candidate: 0, developing: 0, proven: 0, retired: 0 };
  for (const c of (claims ?? []) as Claim[]) byStatus[c.status]++;

  // Proof point confidence mix
  const byConfidence: Record<ConfidenceLevel, number> = { confirmed: 0, reported: 0, missing: 0 };
  for (const p of proofPoints ?? []) byConfidence[p.confidence as ConfidenceLevel]++;
  const totalProof = Math.max(1, (proofPoints ?? []).length);

  // Coverage matrix: claims x story types (via linked proof points' stories)
  const storyTypeById = new Map((stories ?? []).map((s) => [s.id, s.story_type as StoryType | null]));
  const proofById = new Map((proofPoints ?? []).map((p) => [p.id, p]));
  const coverage = new Map<string, Map<StoryType, number>>();
  const confirmedByClaim = new Map<string, number>();
  for (const link of links ?? []) {
    const pp = proofById.get(link.proof_point_id);
    if (!pp) continue;
    if (pp.confidence === 'confirmed') {
      confirmedByClaim.set(link.claim_id, (confirmedByClaim.get(link.claim_id) ?? 0) + 1);
    }
    const st = pp.story_id ? storyTypeById.get(pp.story_id) : null;
    if (!st) continue;
    if (!coverage.has(link.claim_id)) coverage.set(link.claim_id, new Map());
    const row = coverage.get(link.claim_id)!;
    row.set(st, (row.get(st) ?? 0) + 1);
  }

  const activeClaims = ((claims ?? []) as Claim[]).filter((c) => c.status !== 'retired');

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-mt-black-sand/70">Library health, claims coverage, and what needs chasing.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Stories per month */}
        <section className="border-2 border-mt-sand p-4">
          <span className="mt-label">Stories captured</span>
          <div className="mt-4 flex h-32 items-end gap-2">
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold">{m.count || ''}</span>
                <div className="w-full bg-mt-red-ore" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count ? 4 : 1 }} />
                <span className="text-[10px] font-bold uppercase text-mt-black-sand/60">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Claims by lifecycle */}
        <section className="border-2 border-mt-sand p-4">
          <span className="mt-label">Claims by lifecycle</span>
          <dl className="mt-4 space-y-2">
            {(Object.entries(byStatus) as [ClaimStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <dt className="font-bold capitalize">{status}</dt>
                <dd className="text-lg font-extrabold">{count}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Confidence mix */}
        <section className="border-2 border-mt-sand p-4">
          <span className="mt-label">Proof point confidence</span>
          <div className="mt-4 flex h-6 w-full overflow-hidden">
            <div className="bg-mt-coast" style={{ width: `${(byConfidence.confirmed / totalProof) * 100}%` }} />
            <div className="bg-mt-sun" style={{ width: `${(byConfidence.reported / totalProof) * 100}%` }} />
            <div className="bg-mt-red-ore" style={{ width: `${(byConfidence.missing / totalProof) * 100}%` }} />
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt><span className="mr-2 inline-block h-3 w-3 bg-mt-coast" />Confirmed</dt><dd className="font-extrabold">{byConfidence.confirmed}</dd></div>
            <div className="flex justify-between"><dt><span className="mr-2 inline-block h-3 w-3 bg-mt-sun" />Reported</dt><dd className="font-extrabold">{byConfidence.reported}</dd></div>
            <div className="flex justify-between"><dt><span className="mr-2 inline-block h-3 w-3 bg-mt-red-ore" />Missing</dt><dd className="font-extrabold">{byConfidence.missing}</dd></div>
          </dl>
        </section>
      </div>

      {/* Coverage matrix */}
      <section className="mt-6 border-2 border-mt-sand p-4">
        <span className="mt-label">Coverage: claims × story types</span>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2 pr-4 font-bold">Claim</th>
                <th className="pb-2 pr-2 font-bold">Health</th>
                {STORY_TYPES.map((t) => (
                  <th key={t} className="pb-2 pr-2 text-center align-bottom">
                    <StoryTypeBadge type={t} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeClaims.map((claim) => {
                const row = coverage.get(claim.id);
                return (
                  <tr key={claim.id} className="border-t border-mt-sand">
                    <td className="max-w-[280px] py-2 pr-4 font-bold">{claim.title}</td>
                    <td className="py-2 pr-2">
                      <ClaimHealthDot confirmedCount={confirmedByClaim.get(claim.id) ?? 0} />
                    </td>
                    {STORY_TYPES.map((t) => {
                      const n = row?.get(t) ?? 0;
                      return (
                        <td key={t} className={`py-2 pr-2 text-center font-extrabold ${n ? '' : 'bg-mt-coral/40 text-mt-black-sand/30'}`}>
                          {n || '·'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-mt-black-sand/60">Coral cells are empty: no proof points from that story type support the claim.</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Stalest gaps */}
        <section className="border-2 border-mt-sand p-4">
          <span className="mt-label">Stalest gaps</span>
          <ul className="mt-3 space-y-2 text-sm">
            {((gaps ?? []) as (Gap & { stories: { client_name: string | null } | null })[]).map((g) => (
              <li key={g.id}>
                <Link href={`/review/${g.story_id}`} className="hover:text-mt-red-ore">
                  <span className="font-bold">{g.stories?.client_name ?? 'Story'}:</span> {g.description}
                </Link>
                <p className="text-xs text-mt-black-sand/50">
                  {g.status} since {formatDate(g.created_at)}
                  {g.owner_name ? ` · chase ${g.owner_name}` : ''}
                </p>
              </li>
            ))}
            {!(gaps ?? []).length && <li className="text-mt-black-sand/60">No open gaps.</li>}
          </ul>
        </section>

        {/* Pending client approvals */}
        <section className="border-2 border-mt-sand p-4">
          <span className="mt-label">Pending client approvals</span>
          <ul className="mt-3 space-y-2 text-sm">
            {(pendingApprovals ?? []).map((p) => (
              <li key={p.id}>
                <span className="font-bold">{(p.stories as unknown as { client_name: string | null } | null)?.client_name ?? 'Story'}:</span>{' '}
                {p.metric} ({p.value}
                {p.unit ? ` ${p.unit}` : ''})
              </li>
            ))}
            {!(pendingApprovals ?? []).length && <li className="text-mt-black-sand/60">Nothing waiting on clients.</li>}
          </ul>
        </section>

        {/* Capture requests from sales */}
        <section className="border-2 border-mt-sand p-4">
          <span className="mt-label">Capture requests</span>
          <ul className="mt-3 space-y-2 text-sm">
            {(captureRequests ?? []).map((r) => (
              <li key={r.id}>
                <p>{r.description}</p>
                <p className="text-xs text-mt-black-sand/50">
                  {r.suggested_contributor ? `Knows the story: ${r.suggested_contributor} · ` : ''}
                  {formatDate(r.created_at)}
                </p>
              </li>
            ))}
            {!(captureRequests ?? []).length && <li className="text-mt-black-sand/60">No open requests.</li>}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
