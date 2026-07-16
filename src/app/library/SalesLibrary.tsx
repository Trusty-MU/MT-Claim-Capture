'use client';

// The Sales Library: "I'm walking into a meeting with a plant manager at an
// iron ore operation, arm me." Filter by persona + product tag + story type;
// get claims with their best proof, the case studies to send, and the SPIN
// questions to ask. One-tap copy on everything.

import { useMemo, useState } from 'react';
import type { CaseStudy, Claim, Persona, ProductTag, ProofPoint, SpinQuestion, SpinType, StoryType } from '@/lib/types';
import { STORY_TYPE_SHORT } from '@/lib/types';
import { ApprovalBadge, ConfidenceBadge, StoryTypeBadge } from '@/components/brand/badges';
import { CopyButton } from '@/components/CopyButton';

export interface LibraryClaim extends Claim {
  proof: (ProofPoint & { stories: { client_name: string | null; story_type: StoryType | null } | null })[];
}

type LibraryCaseStudy = CaseStudy & {
  stories: { client_name: string | null; commodity: string | null; location: string | null; story_type: StoryType | null; product_tags: string[] } | null;
};

const SPIN_ORDER: SpinType[] = ['situation', 'problem', 'implication', 'need_payoff'];
const SPIN_LABELS: Record<SpinType, string> = {
  situation: 'Situation',
  problem: 'Problem',
  implication: 'Implication',
  need_payoff: 'Need-payoff',
};

export function SalesLibrary({
  claims,
  spinQuestions,
  caseStudies,
  personas,
  productTags,
}: {
  claims: LibraryClaim[];
  spinQuestions: SpinQuestion[];
  caseStudies: LibraryCaseStudy[];
  personas: Persona[];
  productTags: ProductTag[];
}) {
  const [persona, setPersona] = useState('');
  const [tag, setTag] = useState('');
  const [storyType, setStoryType] = useState('');
  const [search, setSearch] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);

  const q = search.toLowerCase();

  const filteredClaims = useMemo(
    () =>
      claims.filter((c) => {
        if (persona && !c.personas.includes(persona)) return false;
        if (tag && !c.product_tags.includes(tag)) return false;
        if (storyType && !c.proof.some((p) => p.stories?.story_type === storyType)) return false;
        if (q && !`${c.title} ${c.description ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [claims, persona, tag, storyType, q]
  );

  const claimIds = new Set(filteredClaims.map((c) => c.id));

  const filteredSpin = useMemo(
    () =>
      spinQuestions.filter((s) => {
        if (persona && !s.personas.includes(persona)) return false;
        if (tag && !s.product_tags.includes(tag)) return false;
        if (storyType && s.story_type && s.story_type !== storyType) return false;
        if (s.claim_id && !claimIds.has(s.claim_id) && (persona || tag || storyType)) return false;
        if (q && !s.text.toLowerCase().includes(q)) return false;
        return true;
      }),
    [spinQuestions, persona, tag, storyType, q, claimIds]
  );

  const filteredCases = useMemo(
    () =>
      caseStudies.filter((cs) => {
        if (storyType && cs.stories?.story_type !== storyType) return false;
        if (tag && !(cs.stories?.product_tags ?? []).includes(tag)) return false;
        if (q && !`${cs.title ?? ''} ${cs.challenge ?? ''} ${cs.stories?.client_name ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [caseStudies, storyType, tag, q]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Sales library</h1>
          <p className="mt-1 text-mt-black-sand/70">Walking into a meeting? Set the filters and arm yourself.</p>
        </div>
        <button type="button" className="mt-btn-ghost px-4 py-2 text-sm" onClick={() => setRequestOpen((o) => !o)}>
          Request a capture
        </button>
      </div>

      {requestOpen && <CaptureRequestForm onDone={() => setRequestOpen(false)} />}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <input
          className="mt-input max-w-xs py-1.5"
          placeholder="Search everything"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="border-2 border-mt-sand bg-white px-2 py-1.5 font-bold" value={persona} onChange={(e) => setPersona(e.target.value)}>
          <option value="">Who are you meeting?</option>
          {personas.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
        <select className="border-2 border-mt-sand bg-white px-2 py-1.5 font-bold" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Any offering</option>
          {productTags.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
        <select className="border-2 border-mt-sand bg-white px-2 py-1.5 font-bold" value={storyType} onChange={(e) => setStoryType(e.target.value)}>
          <option value="">Any story type</option>
          {Object.entries(STORY_TYPE_SHORT).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Claims with best proof */}
      <section className="mt-8">
        <span className="mt-label">Claims you can make · {filteredClaims.length}</span>
        <div className="mt-3 space-y-3">
          {filteredClaims.map((claim) => (
            <div key={claim.id} className="border-2 border-mt-sand p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{claim.title}</p>
                <CopyButton
                  text={`${claim.title}\n${claim.proof
                    .filter((p) => p.confidence !== 'missing')
                    .slice(0, 3)
                    .map((p) => `- ${p.stories?.client_name ? `${p.stories.client_name}: ` : ''}${p.metric}: ${p.value ?? ''} ${p.unit ?? ''}`.trim())
                    .join('\n')}`}
                />
              </div>
              {claim.description && <p className="mt-1 text-sm text-mt-black-sand/70">{claim.description}</p>}
              <ul className="mt-2 space-y-1">
                {claim.proof.slice(0, 3).map((pp) => (
                  <li key={pp.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <ConfidenceBadge level={pp.confidence} />
                    {pp.stories?.client_name && <span className="font-bold">{pp.stories.client_name}:</span>}
                    <span>{pp.metric}</span>
                    <span className="font-extrabold">{pp.value ?? '[XX]'} {pp.unit ?? ''}</span>
                    <ApprovalBadge status={pp.approval} />
                  </li>
                ))}
                {!claim.proof.length && <li className="text-sm italic text-mt-black-sand/50">No proof points linked yet.</li>}
              </ul>
            </div>
          ))}
          {!filteredClaims.length && <p className="bg-mt-sand/50 p-4 text-sm font-bold">No proven or developing claims match.</p>}
        </div>
      </section>

      {/* Case studies to send */}
      <section className="mt-8">
        <span className="mt-label">Case studies to send · {filteredCases.length}</span>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {filteredCases.map((cs) => (
            <div key={cs.id} className="border-2 border-mt-sand p-4">
              <div className="flex items-start justify-between gap-2">
                <a href={`/share/case-study/${cs.id}`} target="_blank" rel="noreferrer" className="font-bold hover:text-mt-red-ore">
                  {cs.title || cs.stories?.client_name || 'Case study'}
                </a>
                {cs.published_url && <CopyButton text={cs.published_url} label="Copy link" />}
              </div>
              <p className="mt-1 text-sm text-mt-black-sand/60">
                {[cs.stories?.commodity, cs.stories?.location].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2">
                <StoryTypeBadge type={cs.stories?.story_type ?? null} />
              </div>
            </div>
          ))}
          {!filteredCases.length && <p className="bg-mt-sand/50 p-4 text-sm font-bold">No published case studies match.</p>}
        </div>
      </section>

      {/* SPIN question set */}
      <section className="mt-8">
        <div className="flex items-center gap-3">
          <span className="mt-label">Questions to ask · {filteredSpin.length}</span>
          {filteredSpin.length > 0 && (
            <CopyButton
              label="Copy the set"
              text={SPIN_ORDER.map((type) => {
                const qs = filteredSpin.filter((s) => s.type === type);
                return qs.length ? `${SPIN_LABELS[type].toUpperCase()}\n${qs.map((s) => `- ${s.text}`).join('\n')}` : '';
              })
                .filter(Boolean)
                .join('\n\n')}
            />
          )}
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {SPIN_ORDER.map((type) => {
            const qs = filteredSpin.filter((s) => s.type === type);
            if (!qs.length) return null;
            return (
              <div key={type} className="border-2 border-mt-sand p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-mt-red-ore">{SPIN_LABELS[type]}</p>
                <ul className="mt-2 space-y-2">
                  {qs.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-2 text-sm">
                      <span>{s.text}</span>
                      <CopyButton text={s.text} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!filteredSpin.length && <p className="bg-mt-sand/50 p-4 text-sm font-bold">No approved questions match. Ask marketing to generate some.</p>}
        </div>
      </section>
    </div>
  );
}

function CaptureRequestForm({ onDone }: { onDone: () => void }) {
  const [description, setDescription] = useState('');
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch('/api/capture-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, suggested_contributor: who || null }),
    });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setTimeout(onDone, 1500);
    }
  }

  if (sent) return <p className="mt-4 border-2 border-mt-coast p-3 font-bold">Request sent. Marketing will chase it.</p>;

  return (
    <div className="mt-4 space-y-2 border-2 border-mt-black-sand p-4">
      <p className="font-bold">What win should we capture?</p>
      <textarea
        className="mt-input min-h-20 text-sm"
        placeholder="e.g. The spiral retrofit at [client]. Recovery jumped and they re-ordered."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="mt-input text-sm"
        placeholder="Who knows the story? (name)"
        value={who}
        onChange={(e) => setWho(e.target.value)}
      />
      <button type="button" className="mt-btn-red px-4 py-2 text-sm" disabled={busy || !description.trim()} onClick={submit}>
        {busy ? 'Sending…' : 'Send request'}
      </button>
    </div>
  );
}
