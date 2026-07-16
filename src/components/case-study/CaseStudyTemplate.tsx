// The MT case study one-pager template, mirroring the Mindarie layout:
// meta strip, hero + pullquote, Challenge/Approach two-column, dark outcomes
// band with 4 stats, claims row, CTA strip, brand footer.

import type { Claim, ProofPoint } from '@/lib/types';

export interface CaseStudyView {
  title: string | null;
  meta_strip: string | null;
  pullquote: string | null;
  challenge: string | null;
  approach: string | null;
  cta_text: string | null;
}

export function CaseStudyTemplate({
  caseStudy,
  proofPoints,
  claims,
}: {
  caseStudy: CaseStudyView;
  proofPoints: ProofPoint[];
  claims: Claim[];
}) {
  const stats = proofPoints.slice(0, 4);

  return (
    <article className="print-page relative bg-white text-mt-black-sand">
      {/* Meta strip */}
      <div className="flex items-center justify-between gap-4 bg-mt-sand px-6 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {caseStudy.meta_strip || 'Case study'}
        </p>
        <div className="h-6 w-6 shrink-0 rounded-bl-full bg-mt-red-ore" aria-hidden />
      </div>

      {/* Hero + pullquote */}
      <header className="px-6 pb-8 pt-10">
        <span className="mt-label">Case study</span>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {caseStudy.title || 'Untitled case study'}
        </h1>
        {caseStudy.pullquote && (
          <blockquote className="mt-6 max-w-2xl border-l-4 border-mt-red-ore pl-4 text-xl font-bold leading-snug">
            {caseStudy.pullquote}
          </blockquote>
        )}
      </header>

      {/* Challenge / Approach two-column */}
      <section className="grid gap-8 px-6 pb-10 sm:grid-cols-2">
        <div>
          <span className="mt-label">The challenge</span>
          <p className="mt-3 text-sm leading-relaxed">{caseStudy.challenge || '—'}</p>
        </div>
        <div>
          <span className="mt-label">The approach</span>
          <p className="mt-3 text-sm leading-relaxed">{caseStudy.approach || '—'}</p>
        </div>
      </section>

      {/* Dark outcomes band with 4 stats */}
      {stats.length > 0 && (
        <section className="bg-mt-black-sand px-6 py-8 text-white">
          <span className="mt-label">The outcomes</span>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((pp) => (
              <div key={pp.id}>
                <p className="text-3xl font-extrabold leading-none text-mt-red-ore">
                  {pp.value ?? '[XX]'}
                  {pp.unit ? <span className="ml-1 text-base font-bold text-white/70">{pp.unit}</span> : null}
                </p>
                <p className="mt-2 text-xs leading-snug text-white/80">{pp.metric}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claims row */}
      {claims.length > 0 && (
        <section className="flex flex-wrap gap-2 bg-mt-sand/60 px-6 py-5">
          {claims.map((c) => (
            <span key={c.id} className="mt-pill">
              {c.title}
            </span>
          ))}
        </section>
      )}

      {/* CTA strip */}
      {caseStudy.cta_text && (
        <section className="bg-mt-red-ore px-6 py-6">
          <p className="text-lg font-extrabold text-white">{caseStudy.cta_text}</p>
        </section>
      )}

      {/* Brand footer */}
      <footer className="flex items-center justify-between bg-mt-black-sand px-6 py-4 text-white">
        <p className="text-sm font-extrabold tracking-tight">
          Mineral <span className="text-mt-red-ore">Technologies</span>
        </p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Fine mineral recovery</p>
      </footer>
    </article>
  );
}

export function caseStudyToMarkdown(caseStudy: CaseStudyView, proofPoints: ProofPoint[], claims: Claim[]): string {
  const lines: string[] = [];
  lines.push(`# ${caseStudy.title ?? 'Case study'}`);
  if (caseStudy.meta_strip) lines.push(`*${caseStudy.meta_strip}*`);
  if (caseStudy.pullquote) lines.push(`\n> ${caseStudy.pullquote}`);
  if (caseStudy.challenge) lines.push(`\n## The challenge\n${caseStudy.challenge}`);
  if (caseStudy.approach) lines.push(`\n## The approach\n${caseStudy.approach}`);
  if (proofPoints.length) {
    lines.push('\n## The outcomes');
    for (const pp of proofPoints) lines.push(`- **${pp.value ?? '[XX]'}${pp.unit ? ` ${pp.unit}` : ''}**: ${pp.metric}`);
  }
  if (claims.length) {
    lines.push('\n## What this proves');
    for (const c of claims) lines.push(`- ${c.title}`);
  }
  if (caseStudy.cta_text) lines.push(`\n${caseStudy.cta_text}`);
  return lines.join('\n');
}
